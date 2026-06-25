import { useState } from "react";
import { logScore } from "../api";

export default function CourseQuestPanel({ courses, focusCourseId, focusTaskId, onScoreLogged }) {
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  const [logTarget, setLogTarget] = useState(null);
  const [scoreInput, setScoreInput] = useState("");
  const [logLoading, setLogLoading] = useState(false);

  function toggleCourse(courseId) {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
    } else {
      setExpandedCourseId(courseId);
      setLogTarget(null);
      setScoreInput("");
    }
  }

  function handleLogClick(courseId, taskId) {
    setLogTarget({ courseId, taskId });
    setScoreInput("");
  }

  function handleCancelLog() {
    setLogTarget(null);
    setScoreInput("");
  }

  async function handleSaveScore(courseId, taskId) {
    if (logLoading) {
      return;
    }
    const parsed = parseFloat(scoreInput);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      return;
    }
    setLogLoading(true);
    try {
      const result = await logScore(courses, courseId, taskId, parsed);
      onScoreLogged(result.courses);
      setLogTarget(null);
      setScoreInput("");
    } catch (err) {
      // leave the input open so user can retry
    }
    setLogLoading(false);
  }

  function isPastDue(dueDate) {
    if (!dueDate) {
      return false;
    }
    return new Date(dueDate) < new Date();
  }

  return (
    <div className="flex flex-col gap-3">
      {courses.map((course) => {
        const isFocusCourse = course.id === focusCourseId;
        const isExpanded = expandedCourseId === course.id;

        return (
          <div
            key={course.id}
            className={`rounded-xl border bg-gray-900 overflow-hidden transition-all ${
              isFocusCourse
                ? "border-violet-500 shadow-[0_0_16px_2px_rgba(139,92,246,0.35)]"
                : "border-gray-700"
            }`}
          >
            <button
              onClick={() => toggleCourse(course.id)}
              className="w-full text-left px-5 py-4 flex flex-col gap-2 hover:bg-gray-800 transition-colors"
            >
              <div className="flex justify-between items-baseline gap-3">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="font-bold text-white shrink-0">{course.code}</span>
                  <span className="text-gray-400 text-sm truncate">{course.name}</span>
                </div>
                <span className="text-gray-400 text-sm shrink-0">
                  {course.grade_so_far.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-violet-500 h-2 rounded-full transition-all"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 shrink-0 w-8 text-right">
                  {course.progress}%
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-800">
                {course.tasks.map((task) => {
                  const isFocusTask = task.id === focusTaskId && course.id === focusCourseId;
                  const isLogging = logTarget && logTarget.courseId === course.id && logTarget.taskId === task.id;
                  const pastDueNoScore = !task.completed && isPastDue(task.due_date) && task.score === null;

                  return (
                    <div
                      key={task.id}
                      className={`px-5 py-3 border-b border-gray-800 last:border-b-0 flex flex-col gap-2 ${
                        task.completed ? "opacity-50" : ""
                      } ${isFocusTask ? "bg-violet-950" : "bg-gray-900"}`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {isFocusTask && (
                          <span className="text-yellow-400 text-sm">⚡</span>
                        )}
                        {pastDueNoScore && (
                          <span className="text-amber-400 text-xs">●</span>
                        )}
                        <span className="text-white text-sm font-medium">{task.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                          {task.type}
                        </span>
                        {task.completed && (
                          <span className="text-green-400 text-sm">✓</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
                        <span>Due {task.due_date}</span>
                        <span>{task.weight}%</span>
                        {task.counts_rule === "best_n_of_m" && (
                          <span className="text-violet-400">best {task.n} of {task.m}</span>
                        )}
                        {task.completed && task.score !== null && (
                          <span className="text-green-400">Score: {task.score}</span>
                        )}
                      </div>

                      {!task.completed && !isLogging && (
                        <button
                          onClick={() => handleLogClick(course.id, task.id)}
                          className="self-start text-xs px-3 py-1 rounded-lg border border-gray-600 text-gray-300 hover:border-violet-500 hover:text-violet-300 transition-colors"
                        >
                          Log Score
                        </button>
                      )}

                      {isLogging && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={scoreInput}
                            onChange={(e) => setScoreInput(e.target.value)}
                            placeholder="0–100"
                            className="w-24 rounded-lg bg-gray-800 border border-gray-600 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
                          />
                          <button
                            onClick={() => handleSaveScore(course.id, task.id)}
                            disabled={logLoading}
                            className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white transition-colors"
                          >
                            {logLoading ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={handleCancelLog}
                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-600 text-gray-400 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
