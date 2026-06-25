import { useState, useRef } from "react";
import { parseSyllabus } from "../api";

export default function SyllabusUpload({ onCoursesLoaded }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  function validateAndSetFile(selected) {
    if (!selected) {
      return;
    }
    if (selected.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      setFile(null);
      return;
    }
    setError("");
    setFile(selected);
  }

  function handleFileChange(e) {
    validateAndSetFile(e.target.files[0]);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    validateAndSetFile(e.dataTransfer.files[0]);
  }

  function handleZoneClick() {
    inputRef.current.click();
  }

  async function handleSubmit() {
    if (loading) {
      return;
    }
    if (!file) {
      setError("Please select a PDF syllabus first.");
      return;
    }

    setLoading(true);
    setError("");

    const reader = new FileReader();
    reader.onload = async function (e) {
      const dataUrl = e.target.result;
      const base64 = dataUrl.split(",")[1];
      try {
        const result = await parseSyllabus(base64);
        onCoursesLoaded(result.courses);
      } catch (err) {
        setError(err.message || "Failed to parse syllabus.");
        setLoading(false);
      }
    };
    reader.onerror = function () {
      setError("Could not read the file.");
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <div className="orb-wrapper">
        <div className="orb" />
        <span className="orb-emoji">🔮</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        onClick={handleZoneClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full max-w-md border-2 border-dashed rounded-xl px-8 py-10 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-violet-400 bg-violet-950"
            : "border-gray-600 bg-gray-900 hover:border-violet-500 hover:bg-gray-800"
        }`}
      >
        {file ? (
          <p className="text-violet-300 font-medium">{file.name}</p>
        ) : (
          <>
            <p className="text-gray-300 font-medium">
              Drop your course outline here
            </p>
            <p className="text-gray-500 text-sm mt-1">or click to browse — PDF only</p>
          </>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-sm text-center max-w-md">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="px-8 py-3 rounded-xl font-bold tracking-widest text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white"
      >
        {loading ? "THE ORB READS YOUR SCROLLS..." : "CONSULT THE KIWIZARD"}
      </button>

      <style>{`
        .orb-wrapper {
          position: relative;
          width: 100px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .orb {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #a855f7, #4c1d95);
          animation: pulse_orb 3s ease-in-out infinite;
          box-shadow: 0 0 40px 8px rgba(168, 85, 247, 0.4);
        }
        .orb-emoji {
          position: relative;
          font-size: 2.5rem;
          z-index: 1;
        }
        @keyframes pulse_orb {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
