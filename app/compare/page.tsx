"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AnalysisReport } from "@/types";

function NeuralBg() {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <div className="absolute rounded-full" style={{ width: 600, height: 600, top: -200, left: -200, background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)" }} />
      <div className="absolute rounded-full" style={{ width: 500, height: 500, bottom: -100, right: -100, background: "radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)" }} />
    </div>
  );
}

function GradeColor(grade: string) {
  const map: Record<string, string> = { A: "#6EE7B7", B: "#A5B4FC", C: "#FCD34D", D: "#FDBA74", F: "#FCA5A5" };
  return map[grade] ?? "#fff";
}

function ScoreBar({ score, maxScore, color }: { score: number; maxScore: number; color: string }) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <motion.div className="h-full rounded-full"
        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}60` }} />
    </div>
  );
}

function RepoInput({ label, value, onChange, loading, onAnalyze }: {
  label: string; value: string; onChange: (v: string) => void;
  loading: boolean; onAnalyze: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onAnalyze()}
          placeholder="https://github.com/owner/repo"
          className="flex-1 px-4 py-3 rounded-xl text-sm text-white outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        />
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          onClick={onAnalyze} disabled={loading}
          className="px-4 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
          style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }}>
          {loading ? "..." : "Analyze"}
        </motion.button>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const router = useRouter();
  const [url1, setUrl1] = useState("");
  const [url2, setUrl2] = useState("");
  const [report1, setReport1] = useState<AnalysisReport | null>(null);
  const [report2, setReport2] = useState<AnalysisReport | null>(null);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [error1, setError1] = useState<string | null>(null);
  const [error2, setError2] = useState<string | null>(null);

  async function analyze(url: string, setLoading: (v: boolean) => void, setReport: (r: AnalysisReport) => void, setError: (e: string | null) => void) {
    setLoading(true); setError(null);
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

  const bothLoaded = report1 && report2;

  return (
    <div className="min-h-screen" style={{ background: "#050816", fontFamily: "'Inter',system-ui,sans-serif" }}>
      <NeuralBg />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-sm group" style={{ color: "rgba(255,255,255,0.35)" }}>
            <motion.span whileHover={{ x: -3 }} transition={{ type: "spring", stiffness: 400 }}>←</motion.span>
            <span className="group-hover:text-white transition-colors">Back</span>
          </motion.button>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs text-white"
              style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }}>C</div>
            <span className="font-bold text-white">ContriFlow</span>
            <span className="text-xs px-2 py-0.5 rounded-full ml-1" style={{ background: "rgba(99,102,241,0.15)", color: "#A5B4FC", border: "1px solid rgba(99,102,241,0.3)" }}>Compare</span>
          </motion.div>
          <div className="w-16" />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-4xl font-black text-white mb-2">Compare Repositories</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Analyze two repos side by side and see which is more contributor-ready</p>
        </motion.div>

        {/* Inputs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 p-6 rounded-3xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex flex-col gap-3">
            <RepoInput label="Repo 1" value={url1} onChange={setUrl1} loading={loading1}
              onAnalyze={() => analyze(url1, setLoading1, setReport1, setError1)} />
            {error1 && <p className="text-xs" style={{ color: "#FCA5A5" }}>{error1}</p>}
          </div>
          <div className="flex flex-col gap-3">
            <RepoInput label="Repo 2" value={url2} onChange={setUrl2} loading={loading2}
              onAnalyze={() => analyze(url2, setLoading2, setReport2, setError2)} />
            {error2 && <p className="text-xs" style={{ color: "#FCA5A5" }}>{error2}</p>}
          </div>
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {bothLoaded && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

              {/* Winner banner */}
              {(() => {
                const winner = report1.totalScore >= report2.totalScore ? report1 : report2;
                const isTie = report1.totalScore === report2.totalScore;
                return (
                  <div className="text-center mb-8 p-5 rounded-2xl"
                    style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.06))", border: "1px solid rgba(99,102,241,0.25)" }}>
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Result</p>
                    <p className="text-xl font-black text-white">
                      {isTie ? "🤝 It's a tie!" : `🏆 ${winner.repoData.fullName} wins!`}
                    </p>
                    {!isTie && (
                      <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                        by {Math.abs(report1.totalScore - report2.totalScore)} points
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Side by side scores */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[report1, report2].map((r, idx) => {
                  const pct = Math.round((r.totalScore / r.maxScore) * 100);
                  const color = GradeColor(r.grade);
                  const isWinner = idx === 0 ? report1.totalScore >= report2.totalScore : report2.totalScore >= report1.totalScore;
                  return (
                    <div key={idx} className="rounded-2xl p-6 flex flex-col items-center gap-3"
                      style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${isWinner ? color + "40" : "rgba(255,255,255,0.07)"}`, boxShadow: isWinner ? `0 0 30px ${color}15` : "none" }}>
                      {r.repoData.avatarUrl && <img src={r.repoData.avatarUrl} alt="" className="w-10 h-10 rounded-xl" />}
                      <div className="text-center">
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{r.repoData.fullName.split("/")[0]}</p>
                        <p className="font-black text-white text-sm">{r.repoData.fullName.split("/")[1]}</p>
                      </div>
                      <span className="text-5xl font-black" style={{ color, textShadow: `0 0 20px ${color}80` }}>{r.grade}</span>
                      <span className="text-3xl font-black text-white">{pct}<span className="text-lg" style={{ color: "rgba(255,255,255,0.3)" }}>/100</span></span>
                      <div className="w-full">
                        <ScoreBar score={r.totalScore} maxScore={r.maxScore} color={color} />
                      </div>
                      <div className="flex gap-3 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                        <span>⭐ {r.repoData.stars.toLocaleString()}</span>
                        <span>🍴 {r.repoData.forks.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Check by check comparison */}
              <p className="text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
                Check by Check
              </p>
              <div className="flex flex-col gap-2">
                {report1.checks.map((check, i) => {
                  const check2 = report2.checks[i];
                  if (!check2) return null;
                  const c1 = GradeColor(check.passed ? "A" : "F");
                  const c2 = GradeColor(check2.passed ? "A" : "F");
                  return (
                    <motion.div key={check.id}
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-xl px-4 py-3"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-xs font-semibold text-white mb-2">{check.label}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs" style={{ color: c1 }}>{check.passed ? "✓ Pass" : "✗ Fail"}</span>
                            <span className="text-xs font-bold" style={{ color: c1 }}>{check.score}/{check.maxScore}</span>
                          </div>
                          <ScoreBar score={check.score} maxScore={check.maxScore} color={c1} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs" style={{ color: c2 }}>{check2.passed ? "✓ Pass" : "✗ Fail"}</span>
                            <span className="text-xs font-bold" style={{ color: c2 }}>{check2.score}/{check2.maxScore}</span>
                          </div>
                          <ScoreBar score={check2.score} maxScore={check2.maxScore} color={c2} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {!bothLoaded && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-center py-20" style={{ color: "rgba(255,255,255,0.2)" }}>
            <p className="text-4xl mb-3">⚔️</p>
            <p className="text-sm">Enter two GitHub URLs above and click Analyze on both</p>
          </motion.div>
        )}

      </div>
    </div>
  );
}