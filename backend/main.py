# load_dotenv must run before importing groq_client, which reads
# os.environ["GROQ_API_KEY"] at module import time.
from dotenv import load_dotenv

load_dotenv()

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq_client import (
    parse_pdf_syllabus,
    ask_wizard,
    log_score,
    calculate_progress_for_courses,
)


class Task(BaseModel):
    id: str = ""
    title: str = ""
    type: str = ""
    due_date: str = ""
    weight: float = 0.0
    counts_rule: str = "all"
    n: int = 0
    m: int = 0
    completed: bool = False
    score: float | None = None


class Course(BaseModel):
    id: str = ""
    code: str = ""
    name: str = ""
    progress: int = 0
    grade_so_far: float = 0.0
    tasks: list[Task] = []


class ParseRequest(BaseModel):
    pdf_base64: str


class WizardRequest(BaseModel):
    courses: list[Course]
    context: str
    proactive: bool = True


class LogScoreRequest(BaseModel):
    courses: list[Course]
    course_id: str
    task_id: str
    score: float


class ProgressRequest(BaseModel):
    courses: list[Course]


app = FastAPI()

allowed_origins = []

frontend_url = os.environ.get("FRONTEND_URL", "")
frontend_url = frontend_url.strip()
if frontend_url.endswith("/"):
    frontend_url = frontend_url[:-1]
if frontend_url != "":
    allowed_origins.append(frontend_url)

# Allow the Vite dev server on localhost or 127.0.0.1 with any port,
# so a preflight still passes if Vite picks a port other than 5173.
local_dev_origins = r"http://(localhost|127\.0\.0\.1):\d+"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=local_dev_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def courses_to_dicts(courses):
    courses_dicts = []
    for course in courses:
        courses_dicts.append(course.model_dump())
    return courses_dicts


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/parse-syllabus")
async def parse_syllabus(request: ParseRequest):
    if not request.pdf_base64:
        raise HTTPException(status_code=400, detail="pdf_base64 is required.")
    estimated_bytes = len(request.pdf_base64) * 3 / 4
    if estimated_bytes > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="PDF too large, must be under 20MB.")
    try:
        result = await parse_pdf_syllabus(request.pdf_base64)
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))
    return result


@app.post("/ask-wizard")
async def ask_wizard_endpoint(request: WizardRequest):
    if not request.context:
        raise HTTPException(status_code=400, detail="context is required.")
    courses_dicts = courses_to_dicts(request.courses)
    try:
        result = await ask_wizard(courses_dicts, request.context, request.proactive)
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))
    return result


@app.post("/log-score")
async def log_score_endpoint(request: LogScoreRequest):
    if request.score < 0 or request.score > 100:
        raise HTTPException(status_code=400, detail="score must be between 0 and 100.")
    courses_dicts = courses_to_dicts(request.courses)
    try:
        result = log_score(courses_dicts, request.course_id, request.task_id, request.score)
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))
    return result


@app.post("/calculate-progress")
async def calculate_progress_endpoint(request: ProgressRequest):
    courses_dicts = courses_to_dicts(request.courses)
    result = calculate_progress_for_courses(courses_dicts)
    return {"courses": result}
