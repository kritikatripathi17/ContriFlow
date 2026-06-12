"use client";

import { useState, KeyboardEvent } from "react";

interface UrlInputProps {
  onAnalyze: (repoUrl: string) => Promise<void>;
  loading: boolean;
}

export default function UrlInput({ onAnalyze, loading }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function validate(value: string): string | null {
    if (!value.trim()) {
      return "Please enter a GitHub repository URL.";
    }

    if (
      !value.trim().startsWith("https://github.com/") &&
      !value.trim().startsWith("https://www.github.com/")
    ) {
      return "URL must point to a GitHub repository.";
    }

    return null;
  }

  async function handleAnalyze() {
    const error = validate(url);

    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);
    await onAnalyze(url.trim());
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !loading) {
      handleAnalyze();
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="https://github.com/owner/repo"
          className="flex-1 px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700"
        />

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="px-6 py-3 rounded-lg bg-indigo-600 text-white"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {validationError && (
        <p className="mt-2 text-sm text-red-400">
          {validationError}
        </p>
      )}
    </div>
  );
}