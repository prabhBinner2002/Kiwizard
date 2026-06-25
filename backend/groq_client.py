from groq import AsyncGroq
import os
import json
import time
import uuid
import base64

client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])
last_call_time = 0.0

MODEL = "llama-3.3-70b-versatile"


def enforce_rate_limit():
    global last_call_time
    now = time.time()
    elapsed = now - last_call_time
    if elapsed < 2.0:
        time.sleep(2.0 - elapsed)
    last_call_time = time.time()


def strip_markdown_fences(text):
    cleaned = text.strip()
    if cleaned.startswith("```"):
        newline_index = cleaned.find("\n")
        if newline_index != -1:
            cleaned = cleaned[newline_index + 1 :]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
    return cleaned.strip()


def extract_pdf_text(pdf_base64):
    from io import BytesIO
    from pypdf import PdfReader

    pdf_bytes = base64.b64decode(pdf_base64)
    reader = PdfReader(BytesIO(pdf_bytes))
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text = text + page_text + "\n"
    return text


async def parse_pdf_syllabus(pdf_base64):
    try:
        syllabus_text = extract_pdf_text(pdf_base64)
    except Exception as error:
        return {"courses": [], "error": "could not read PDF: " + str(error)}

    enforce_rate_limit()
    user_message = (
        "Here is the extracted text of a university course outline. Extract the full course outline as JSON.\n\nSyllabus text:\n"
        + syllabus_text
    )
    try:
        completion = await client.chat.completions.create(
            model=MODEL,
            temperature=0.1,
            max_tokens=3000,
            messages=[
                {"role": "system", "content": PARSE_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
        )
    except Exception as error:
        return {"courses": [], "error": str(error)}

    raw_text = completion.choices[0].message.content
    cleaned_text = strip_markdown_fences(raw_text)
    try:
        data = json.loads(cleaned_text)
    except Exception as error:
        return {"courses": [], "error": "could not parse syllabus JSON"}

    courses = data.get("courses")
    if courses is None:
        courses = []

    for course in courses:
        if not course.get("id"):
            course["id"] = uuid.uuid4().hex[:8]
        for task in course.get("tasks", []):
            if not task.get("id"):
                task["id"] = uuid.uuid4().hex[:8]

    courses = calculate_progress_for_courses(courses)
    return {"courses": courses}


async def ask_wizard(courses, context, proactive):
    enforce_rate_limit()
    summary_text = build_course_summary(courses)
    warnings = build_warnings(courses)

    user_message = "Student question: " + context + "\n\nCourses:\n" + summary_text
    if proactive and len(warnings) > 0:
        user_message = user_message + "\n\nThings they might be overlooking:\n"
        for warning in warnings:
            user_message = user_message + "- " + warning + "\n"

    try:
        completion = await client.chat.completions.create(
            model=MODEL,
            temperature=0.7,
            max_tokens=250,
            messages=[
                {"role": "system", "content": WIZARD_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
        )
        wizard_response = completion.choices[0].message.content
    except Exception as error:
        wizard_response = (
            "The crystal ball clouds over for a moment. Ask me again shortly."
        )

    focus_course_id = ""
    focus_task_id = ""
    earliest_due = None
    for course in courses:
        for task in course.get("tasks", []):
            if task.get("completed"):
                continue
            due_date = task.get("due_date")
            if due_date is None:
                continue
            if earliest_due is None or due_date < earliest_due:
                earliest_due = due_date
                focus_course_id = course.get("id", "")
                focus_task_id = task.get("id", "")

    return {
        "response": wizard_response,
        "focus_course_id": focus_course_id,
        "focus_task_id": focus_task_id,
        "warnings": warnings,
    }


def build_course_summary(courses):
    lines = []
    for course in courses:
        header = (
            "Course "
            + str(course.get("code"))
            + " | progress "
            + str(course.get("progress"))
            + "% | grade so far "
            + str(course.get("grade_so_far"))
        )
        lines.append(header)
        for task in course.get("tasks", []):
            if task.get("completed"):
                continue
            line = (
                "  - "
                + str(task.get("title"))
                + " | due "
                + str(task.get("due_date"))
                + " | weight "
                + str(task.get("weight"))
                + " | rule "
                + str(task.get("counts_rule"))
                + " | n "
                + str(task.get("n"))
                + " | m "
                + str(task.get("m"))
                + " | score "
                + str(task.get("score"))
            )
            lines.append(line)
    summary = "\n".join(lines)
    return summary


def build_warnings(courses):
    warnings = []
    for course in courses:
        for task in course.get("tasks", []):
            if task.get("counts_rule") == "best_n_of_m":
                completed_in_group = count_completed_in_group(course, task)
                needed = task.get("n")
                days = days_until(task.get("due_date"))
                if (
                    needed is not None
                    and completed_in_group < needed
                    and days is not None
                    and days <= 7
                ):
                    still_needed = needed - completed_in_group
                    warnings.append(
                        str(course.get("code"))
                        + ": "
                        + str(task.get("title"))
                        + " is due soon and you still need "
                        + str(still_needed)
                        + " more counting scores in this group."
                    )
            score = task.get("score")
            days = days_until(task.get("due_date"))
            if score is None and days is not None and days < 0:
                warnings.append(
                    str(course.get("code"))
                    + ": "
                    + str(task.get("title"))
                    + " is past due with no score logged."
                )
    return warnings


def count_completed_in_group(course, target_task):
    group_type = target_task.get("type")
    count = 0
    for task in course.get("tasks", []):
        if task.get("type") != group_type:
            continue
        if task.get("counts_rule") != "best_n_of_m":
            continue
        if task.get("completed"):
            count = count + 1
    return count


def days_until(due_date):
    if due_date is None:
        return None
    try:
        due_struct = time.strptime(due_date, "%Y-%m-%d")
    except Exception as error:
        return None
    due_seconds = time.mktime(due_struct)
    now_seconds = time.time()
    days = (due_seconds - now_seconds) / 86400.0
    return days


def calculate_progress_for_courses(courses):
    for course in courses:
        calculate_single_course_progress(course)
    return courses


def sort_by_score(task):
    return task.get("score")


def calculate_single_course_progress(course):
    tasks = course.get("tasks", [])
    groups = {}
    for task in tasks:
        key = str(task.get("type")) + "|" + str(task.get("counts_rule"))
        if key not in groups:
            groups[key] = []
        groups[key].append(task)

    progress_total = 0.0
    grade_total = 0.0

    for key in groups:
        group_tasks = groups[key]
        rule = group_tasks[0].get("counts_rule")
        if rule == "best_n_of_m":
            completed_tasks = []
            for task in group_tasks:
                if task.get("completed") and task.get("score") is not None:
                    completed_tasks.append(task)
            completed_tasks.sort(key=sort_by_score, reverse=True)
            n = group_tasks[0].get("n")
            if n is None:
                n = len(completed_tasks)
            counting_tasks = completed_tasks[:n]
            for task in counting_tasks:
                weight = task.get("weight")
                if weight is None:
                    weight = 0.0
                score = task.get("score")
                progress_total = progress_total + weight
                grade_total = grade_total + (score * weight / 100.0)
        else:
            for task in group_tasks:
                if not task.get("completed"):
                    continue
                weight = task.get("weight")
                if weight is None:
                    weight = 0.0
                progress_total = progress_total + weight
                score = task.get("score")
                if score is not None:
                    grade_total = grade_total + (score * weight / 100.0)

    progress = int(progress_total)
    if progress > 100:
        progress = 100
    course["progress"] = progress
    course["grade_so_far"] = float(grade_total)
    return course


def log_score(courses, course_id, task_id, score):
    target_course = None
    for course in courses:
        if course.get("id") == course_id:
            target_course = course
            break

    if target_course is None:
        return {
            "courses": courses,
            "course_id": course_id,
            "new_progress": 0,
            "grade_so_far": 0.0,
        }

    target_task = None
    for task in target_course.get("tasks", []):
        if task.get("id") == task_id:
            target_task = task
            break

    if target_task is None:
        return {
            "courses": courses,
            "course_id": course_id,
            "new_progress": target_course.get("progress", 0),
            "grade_so_far": target_course.get("grade_so_far", 0.0),
        }

    target_task["score"] = score
    target_task["completed"] = True
    calculate_single_course_progress(target_course)

    return {
        "courses": courses,
        "course_id": course_id,
        "new_progress": target_course["progress"],
        "grade_so_far": target_course["grade_so_far"],
    }


WIZARD_SYSTEM_PROMPT = """
You are the Kiwizard - an ancient, slightly theatrical, deeply wise study oracle
who lives inside a glowing crystal ball. You speak with warmth and dry wit, never fluff.
You have one job: look at a student's courses and tasks and tell them exactly what
to work on right now and why — and flag anything they might be overlooking.

Rules:
- NEVER list everything. Answer the question asked, then add one proactive warning if relevant.
- Always recommend exactly ONE task to focus on.
- Explain urgency in one sentence: due date, weight, and whether it counts toward a best-of-N rule.
- If a student is close to locking in a bad score in a best-of-N group, warn them.
- If a task is past due with no score logged, call it out.
- Close with a short motivational line that does not feel corporate.
- Keep total response under 100 words.
- Speak as the Kiwizard. Vary your opening phrase.
- Output ONLY the wizard spoken response. No JSON, no formatting, no bullet points.
"""

PARSE_SYSTEM_PROMPT = """
You are extracting a complete course outline from a university PDF syllabus.
Return ONLY valid JSON with no markdown fences, no explanation, no extra keys.

Shape:
{
  "courses": [
    {
      "id": "",
      "code": "<course code e.g. CPSC 457>",
      "name": "<full course name>",
      "progress": 0,
      "grade_so_far": 0.0,
      "tasks": [
        {
          "id": "",
          "title": "<task name>",
          "type": "<assignment | exam | quiz | lab | project>",
          "due_date": "<YYYY-MM-DD, estimate if missing>",
          "weight": <float, individual weight if all count, or per-item weight if best_n_of_m>,
          "counts_rule": "<all | best_n_of_m>",
          "n": <int, how many count, same as m if all count>,
          "m": <int, how many total exist>,
          "completed": false,
          "score": null
        }
      ]
    }
  ]
}

Critical rules:
- If the syllabus says "best 6 of 10 assignments worth 30% total" then each item weight = 5.0 (total / n), n = 6, m = 10, counts_rule = best_n_of_m.
- For any best_n_of_m component, output ONE task entry per item (m entries total), each with the same per-item weight, n, and m. Estimate a separate due date for each item; for weekly tutorials, space them one per tutorial week.
- Example: "best 10 of 12 weekly tutorial participation worth 10% total" produces 12 tasks, type "lab", each weight = 1.0, n = 10, m = 12, counts_rule = best_n_of_m, with one estimated due date per week.
- Use type "lab" for tutorial or participation components.
- If it says "3 exams each worth 25%" then weight = 25.0, n = 3, m = 3, counts_rule = all.
- Assignments may have different individual weights (e.g., 13%, 14%, 13%); list each as its own task with counts_rule = all and its own weight.
- If the final exam date is undetermined (e.g., "Registrar Scheduled Final Exam"), set its due_date to the last day of the term's final examination period — the final exam is always the last exam of the semester.
- Never return null. Leave id fields as empty string, they will be filled in.
- Estimate due dates from context (week numbers, lecture schedule) if not explicit.
- One course per syllabus is normal. Multiple courses only if the PDF covers multiple.
"""
