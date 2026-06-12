"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AnalysisReport } from "@/types";

export default function BadgePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function analyze() {
    setLoading(true); setError(null); setReport(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: url }),
      });
      const data = await res.json();
      if (data.success && data.report) setReport(data.report);
      else setError(data.error?.message ?? "Failed");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const gradeColor: Record<string, string> = {
    A: "brightgreen", B: "blue", C: "yellow", D: "orange", F: "red",
  };

  const badges = report ? [
    {
      key: "score",
      label: "Score Badge",
      desc: "Shows your contributor readiness score",
      markdown: `[![ContriFlow Score](https://img.shields.io/badge/ContriFlow-${Math.round((report.totalScore / report.maxScore) * 100)}%25-${gradeColor[report.grade]}?style=for-the-badge&logo=github)](https://contriflow.vercel.app)`,
      preview: `https://img.shields.io/badge/ContriFlow-${Math.round((report.totalScore / report.maxScore) * 100)}%25-${gradeColor[report.grade]}?style=for-the-badge&logo=github`,
    },
    {
      key: "grade",
      label: "Grade Badge",
      desc: "Shows your contributor readiness grade",
      markdown: `[![ContriFlow Grade](https://img.shields.io/badge/Contributor_Ready-Grade_${report.grade}-${gradeColor[report.grade]}?style=for-the-badge&logo=github)](https://contriflow.vercel.app)`,
      preview: `https://img.shields.io/badge/Contributor_Ready-Grade_${report.grade}-${gradeColor[report.grade]}?style=for-the-badge&logo=github`,
    },
    {
      key: "flat",
      label: "Flat Badge",
      desc: "Minimal flat style badge",
      markdown: `[![ContriFlow](https://img.shields.io/badge/ContriFlow-${report.grade}_${Math.round((report.totalScore / report.maxScore) * 100)}%25-${gradeColor[report.grade]}?style=flat-square)](https://contriflow.vercel.app)`,
      preview: `https://img.shields.io/badge/ContriFlow-${report.grade}_${Math.round((report.totalScore / report.maxScore) * 100)}%25-${gradeColor[report.grade]}?style=flat-square`,
    },
  ] : [];

  return (
    <div className="min-h-screen" style={{ background: "#050816", fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute rounded-full" style={{ width: 500, height: 500, top: -100, left: -100, background: "radial-gradient(circle,rgba(99,102,241,0.07) 0%,transparent 70%)" }} />
        <div className="absolute rounded-full" style={{ width: 400, height: 400, bottom: 0, right: -100, background: "radial-gradient(circle,rgba(16,185,129,0.06) 0%,transparent 70%)" }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-sm group" style={{ color: "rgba(255,255,255,0.35)" }}>
            <motion.span whileHover={{ x: -3 }} transition={{ type: "spring", stiffness: 400 }}>←</motion.span>
            <span className="group-hover:text-white transition-colors">Back</span>
          </motion.button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs text-white"
              style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }}>C</div>
            <span className="font-bold text-white">ContriFlow</span>
            <span className="text-xs px-2 py-0.5 rounded-full ml-1"
              style={{ background: "rgba(99,102,241,0.15)", color: "#A5B4FC", border: "1px solid rgba(99,102,241,0.3)" }}>
              Badge Generator
            </span>
          </div>
          <div className="w-16" />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-2">Badge Generator</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            Generate a contributor readiness badge to add to your README
          </p>
        </motion.div>

        {/* Input */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl p-6 mb-6"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
            Enter your repository URL
          </p>
          <div className="flex gap-2">
            <input value={url} onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && analyze()}
              placeholder="https://github.com/owner/repo"
              className="flex-1 px-4 py-3 rounded-xl text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={analyze} disabled={loading || !url}
              className="px-5 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }}>
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-4 h-4 rounded-full border-2 border-transparent mx-2" style={{ borderTopColor: "#fff" }} />
              ) : "Generate"}
            </motion.button>
          </div>
          {error && <p className="text-xs mt-2" style={{ color: "#FCA5A5" }}>{error}</p>}
        </motion.div>

        {/* Badges */}
        <AnimatePresence>
          {report && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">

              {/* Repo summary */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {report.repoData.avatarUrl && <img src={report.repoData.avatarUrl} alt="" className="w-8 h-8 rounded-lg" />}
                <div>
                  <p className="text-sm font-bold text-white">{report.repoData.fullName}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Grade {report.grade} • {Math.round((report.totalScore / report.maxScore) * 100)}/100
                  </p>
                </div>
              </div>

              <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>
                Choose a badge style
              </p>

              {badges.map((badge, i) => (
                <motion.div key={badge.key}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-2xl p-5 flex flex-col gap-4"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{badge.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{badge.desc}</p>
                    </div>
                    {/* Badge preview */}
                    <img src={badge.preview} alt="badge" className="h-6" onError={e => (e.currentTarget.style.display = "none")} />
                  </div>

                  {/* Markdown code */}
                  <div className="rounded-xl p-3 text-xs font-mono overflow-x-auto"
                    style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap" }}>
                    {badge.markdown}
                  </div>

                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => copy(badge.markdown, badge.key)}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: copied === badge.key ? "rgba(16,185,129,0.2)" : "rgba(99,102,241,0.15)",
                      color: copied === badge.key ? "#6EE7B7" : "#A5B4FC",
                      border: `1px solid ${copied === badge.key ? "rgba(16,185,129,0.3)" : "rgba(99,102,241,0.3)"}`,
                    }}>
                    {copied === badge.key ? "✓ Copied to clipboard!" : "Copy Markdown"}
                  </motion.button>
                </motion.div>
              ))}

              {/* How to use */}
              <div className="rounded-2xl p-5"
                style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <p className="text-sm font-bold text-white mb-2">How to add to your README</p>
                <ol className="flex flex-col gap-1.5">
                  {["Copy the markdown above", "Open your README.md on GitHub", "Paste it at the top of the file", "Commit the change"].map((step, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: "rgba(99,102,241,0.3)", color: "#A5B4FC" }}>{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {!report && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-center py-16" style={{ color: "rgba(255,255,255,0.2)" }}>
            <p className="text-4xl mb-3">🏷️</p>
            <p className="text-sm">Enter your repo URL to generate badges</p>
          </motion.div>
        )}

      </div>
    </div>
  );
}