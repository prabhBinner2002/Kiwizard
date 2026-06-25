import { useState } from "react";
import SyllabusUpload from "./components/SyllabusUpload";
import WizardOracle from "./components/WizardOracle";

function App() {
  const [courses, setCourses] = useState([]);
  const [view, setView] = useState("setup");
  const [focusCourseId, setFocusCourseId] = useState(null);
  const [focusTaskId, setFocusTaskId] = useState(null);

  function handleCoursesLoaded(loadedCourses) {
    setCourses(loadedCourses);
    setView("oracle");
  }

  function handleScoreLogged(updatedCourses) {
    setCourses(updatedCourses);
  }

  function handleCoursesUpdated(updatedCourses) {
    setCourses(updatedCourses);
  }

  function handleFocusUpdate(courseId, taskId) {
    setFocusCourseId(courseId);
    setFocusTaskId(taskId);
  }

  function handleReset() {
    setCourses([]);
    setView("setup");
    setFocusCourseId(null);
    setFocusTaskId(null);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="text-center py-8 border-b border-gray-800">
        <h1 className="text-4xl font-bold tracking-widest text-emerald-400">
          KIWIZARD
        </h1>
        <p className="text-sm tracking-widest text-gray-400 mt-1 uppercase">
          The Study Oracle
        </p>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {view === "setup" && (
          <SyllabusUpload onCoursesLoaded={handleCoursesLoaded} />
        )}

        {view === "oracle" && (
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <WizardOracle
                courses={courses}
                focusCourseId={focusCourseId}
                focusTaskId={focusTaskId}
                onFocusUpdate={handleFocusUpdate}
                onScoreLogged={handleScoreLogged}
                onReset={handleReset}
              />
            </div>
            <div className="flex-1">
              <CourseQuestPanel
                courses={courses}
                focusCourseId={focusCourseId}
                focusTaskId={focusTaskId}
                onCoursesUpdated={handleCoursesUpdated}
                onScoreLogged={handleScoreLogged}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function CourseQuestPanel({ courses, focusCourseId, focusTaskId, onCoursesUpdated, onScoreLogged }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <h2 className="text-lg font-semibold text-gray-300 mb-4">Courses</h2>
      {courses.length === 0 && (
        <p className="text-gray-500 text-sm">No courses loaded.</p>
      )}
      {courses.map((course) => (
        <div
          key={course.id}
          className={`mb-4 p-3 rounded-lg border ${
            course.id === focusCourseId
              ? "border-emerald-500 bg-gray-800"
              : "border-gray-700 bg-gray-800"
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold text-white">{course.code}</span>
            <span className="text-xs text-gray-400">{course.progress}% complete</span>
          </div>
          <p className="text-xs text-gray-500 mb-2">{course.name}</p>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full"
              style={{ width: `${course.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Grade so far: {course.grade_so_far.toFixed(1)}%
          </p>
        </div>
      ))}
    </div>
  );
}

export default App;
