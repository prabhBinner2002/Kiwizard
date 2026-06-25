import { useState } from "react";
import SyllabusUpload from "./components/SyllabusUpload";
import WizardOracle from "./components/WizardOracle";
import CourseQuestPanel from "./components/CourseQuestPanel";

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


export default App;
