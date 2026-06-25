const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function handleResponse(response) {
  if (!response.ok) {
    let detail = "Request failed";
    try {
      const body = await response.json();
      if (body.detail) {
        detail = body.detail;
      }
    } catch (_) {
      // ignore parse failure, use default message
    }
    throw new Error(detail);
  }
  return response.json();
}

export async function parseSyllabus(pdfBase64) {
  try {
    const response = await fetch(`${API_URL}/parse-syllabus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pdf_base64: pdfBase64 }),
    });
    return await handleResponse(response);
  } catch (error) {
    throw new Error(error.message || "Failed to parse syllabus");
  }
}

export async function askWizard(courses, context, proactive) {
  try {
    const response = await fetch(`${API_URL}/ask-wizard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courses, context, proactive }),
    });
    return await handleResponse(response);
  } catch (error) {
    throw new Error(error.message || "Failed to reach the Kiwizard");
  }
}

export async function logScore(courses, courseId, taskId, score) {
  try {
    const response = await fetch(`${API_URL}/log-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courses, course_id: courseId, task_id: taskId, score }),
    });
    return await handleResponse(response);
  } catch (error) {
    throw new Error(error.message || "Failed to log score");
  }
}

export async function calculateProgress(courses) {
  try {
    const response = await fetch(`${API_URL}/calculate-progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courses }),
    });
    return await handleResponse(response);
  } catch (error) {
    throw new Error(error.message || "Failed to calculate progress");
  }
}
