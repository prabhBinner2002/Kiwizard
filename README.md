# Kiwizard

**The Study Oracle** — an AI-powered study assistant that replaces cluttered dashboards with one clear answer: *what should I work on right now?*

Upload your course syllabi, ask the wizard a question, and get a focused recommendation based on due dates, weights, and your progress.

## Features

- **Syllabus parsing** — Upload a PDF course outline; Groq extracts courses, assignments, exams, due dates, and grading weights into a structured quest list.
- **Wizard Oracle** — Ask natural-language questions (e.g. "What should I do tonight?"). The AI considers your full course load and highlights what matters most.
- **Course Quest Panel** — Browse courses and tasks, track completion progress, and log scores to update grades and progress bars.
- **Proactive warnings** — Optional mode that surfaces overlooked deadlines or high-weight items before you even ask.

## Tech Stack

| Layer    | Stack                                |
|----------|--------------------------------------|
| Frontend | React 19, Vite, Tailwind CSS         |
| Backend  | FastAPI, Python                      |
| AI       | Groq API (`llama-3.3-70b-versatile`) |
| State    | React `useState` only (no database)  |

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- A [Groq API key](https://console.groq.com/)

## Setup

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd Kiwizard
```

### 2. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Start the API server:

```bash
uvicorn main:app --reload --port 8000
```

The backend runs at **http://localhost:8000**. Health check: `GET /health`.

### 3. Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The app runs at **http://localhost:5173**.

## Usage

1. Open **http://localhost:5173** in your browser.
2. **Upload a syllabus PDF** on the setup screen and click to parse it.
3. On the oracle view:
   - Use the **Wizard Oracle** (left) to ask what to study; toggle proactive mode for automatic warnings.
   - Use the **Course Quest Panel** (right) to expand courses, mark tasks, and log scores.
4. Click **Reset** to clear courses and upload new syllabi.

## API Endpoints

| Method | Path                  | Description                          |
|--------|-----------------------|--------------------------------------|
| GET    | `/health`             | Health check                         |
| POST   | `/parse-syllabus`     | Parse a base64-encoded PDF syllabus  |
| POST   | `/ask-wizard`         | Get a study recommendation           |
| POST   | `/log-score`          | Log a task score and recalc progress |
| POST   | `/calculate-progress` | Recalculate progress for all courses |

## Environment Variables

| Variable       | Where    | Description                                               |
|----------------|----------|-----------------------------------------------------------|
| `GROQ_API_KEY` | Backend  | Required. Groq API key                                    |
| `FRONTEND_URL` | Backend  | Optional. Extra CORS origin for production                |
| `VITE_API_URL` | Frontend | Optional. API base URL (default: `http://localhost:8000`) |

## Production Build

**Frontend:**

```bash
cd frontend
npm run build
npm run preview   # optional local preview of production build
```

Set `VITE_API_URL` to your deployed backend URL before building.

**Backend:**

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

Set `FRONTEND_URL` to your deployed frontend origin so CORS allows requests.

## Project Structure

```
Kiwizard/
├── backend/
│   ├── main.py           # FastAPI routes
│   ├── groq_client.py    # All Groq / AI logic
│   ├── requirements.txt
│   └── .env              # GROQ_API_KEY (not committed)
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   └── components/
    │       ├── SyllabusUpload.jsx
    │       ├── WizardOracle.jsx
    │       └── CourseQuestPanel.jsx
    └── package.json
```

## Notes

- All Groq calls live in `groq_client.py` and are rate-limited to at least 2 seconds apart.
- Syllabus PDFs must be under **20 MB**.
- Course data lives in browser memory only; refreshing the page clears it.
