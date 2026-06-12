"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import UrlInput from "@/components/UrlInput";
import { AnalyzeResponse } from "../types";

// ── Neural Network Canvas ──────────────────────────────────────────────────
function NeuralNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const nodesRef = useRef<Array<{
    x: number; y: number; vx: number; vy: number;
    radius: number; color: string; pulsePhase: number;
  }>>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const colors = ["#6EE7B7", "#818CF8", "#F472B6", "#FCD34D", "#34D399", "#A78BFA", "#60A5FA", "#F87171"];
    const nodeCount = 55;
    nodesRef.current = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 5 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      pulsePhase: Math.random() * Math.PI * 2,
    }));

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleTouch = (e: TouchEvent) => {
      if (e.touches[0]) {
        mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouch);

    let t = 0;
    const draw = () => {
      t += 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const nodes = nodesRef.current;
      const mouse = mouseRef.current;

      // Update positions
      nodes.forEach(n => {
        // Mouse repulsion
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          n.vx += (dx / dist) * 0.5;
          n.vy += (dy / dist) * 0.5;
        }
        // Damping
        n.vx *= 0.98;
        n.vy *= 0.98;
        n.x += n.vx;
        n.y += n.vy;
        // Bounce
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
        n.x = Math.max(0, Math.min(canvas.width, n.x));
        n.y = Math.max(0, Math.min(canvas.height, n.y));
      });

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            const alpha = (1 - dist / 160) * 0.25;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach(n => {
        const pulse = Math.sin(t * 2 + n.pulsePhase) * 0.3 + 0.7;
        const r = n.radius * pulse;

        // Glow
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4);
        grad.addColorStop(0, n.color + "60");
        grad.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = n.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Mouse node
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(167,139,250,0.6)";
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#A78BFA";
      ctx.fill();
      ctx.shadowBlur = 0;

      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouch);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: 0.7 }}
    />
  );
}

// ── Typing animation ───────────────────────────────────────────────────────
const WORDS = ["contributor-ready?", "well documented?", "beginner-friendly?", "open source ready?"];

function TypingText() {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = WORDS[wordIndex];
    let timeout: ReturnType<typeof setTimeout>;
    if (!deleting && displayed.length < word.length) {
      timeout = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 60);
    } else if (!deleting && displayed.length === word.length) {
      timeout = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 35);
    } else {
      setDeleting(false);
      setWordIndex(i => (i + 1) % WORDS.length);
    }
    return () => clearTimeout(timeout);
  }, [displayed, deleting, wordIndex]);

  return (
    <span style={{ background: "linear-gradient(90deg, #6EE7B7, #818CF8, #F472B6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
      {displayed}<span style={{ WebkitTextFillColor: "#A78BFA" }}>|</span>
    </span>
  );
}

// ── Example repo card ──────────────────────────────────────────────────────
const EXAMPLE_REPOS = [
  { label: "facebook/react", url: "https://github.com/facebook/react", grade: "A", score: 92, color: "#6EE7B7" },
  { label: "microsoft/vscode", url: "https://github.com/microsoft/vscode", grade: "A", score: 95, color: "#818CF8" },
  { label: "pallets/flask", url: "https://github.com/pallets/flask", grade: "B", score: 78, color: "#F472B6" },
];

function RepoCard({ label, grade, score, color, onClick, disabled }: {
  label: string; grade: string; score: number; color: string;
  onClick: () => void; disabled: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-40, 40], [8, -8]);
  const rotateY = useTransform(x, [-40, 40], [-8, 8]);

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={e => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        x.set(e.clientX - rect.left - rect.width / 2);
        y.set(e.clientY - rect.top - rect.height / 2);
      }}
      onMouseLeave={() => { animate(x, 0, { duration: 0.4 }); animate(y, 0, { duration: 0.4 }); }}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", background: "rgba(255,255,255,0.04)", border: `1px solid ${color}30` }}
      whileHover={{ scale: 1.04, borderColor: color + "60" }}
      whileTap={{ scale: 0.97 }}
      className="relative w-full text-left p-4 rounded-2xl cursor-pointer disabled:opacity-40 overflow-hidden group"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
        style={{ background: `radial-gradient(circle at 50% 0%, ${color}15, transparent 70%)` }} />
      <div className="relative flex items-center justify-between mb-3">
        <span className="text-sm font-mono text-white">{label}</span>
        <span className="text-xl font-black" style={{ color }}>{grade}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
          initial={{ width: 0 }} animate={{ width: `${score}%` }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }} />
      </div>
      <span className="text-xs mt-1 block" style={{ color: "rgba(255,255,255,0.3)" }}>{score}pts</span>
    </motion.button>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze(repoUrl: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      const data: AnalyzeResponse = await res.json();
      if (!data.success || !data.report) {
        setError(data.error?.message ?? "Analysis failed."); return;
      }
      sessionStorage.setItem("contriflow_report", JSON.stringify(data.report));
      router.push("/report");
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col overflow-hidden relative" style={{ background: "#050816" }}>
      <NeuralNetwork />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative z-10 w-full px-6 py-5 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm text-white"
            style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>C</div>
          <span className="font-bold text-white tracking-tight">ContriFlow</span>
          <button onClick={() => router.push("/compare")}
  className="text-xs px-3 py-1.5 rounded-lg font-medium"
  style={{ background: "rgba(99,102,241,0.15)", color: "#A5B4FC", border: "1px solid rgba(99,102,241,0.3)" }}>
  ⚔️ Compare
</button>
<button onClick={() => router.push("/badge")}
  className="text-xs px-3 py-1.5 rounded-lg font-medium"
  style={{ background: "rgba(16,185,129,0.15)", color: "#6EE7B7", border: "1px solid rgba(16,185,129,0.3)" }}>
  🏷️ Badge
</button>
        </div>
        <span className="text-xs px-3 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
          Open Source Intelligence
        </span>
      </motion.header>

      {/* Hero */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-10">

          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-widest uppercase"
              style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", color: "#A5B4FC" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              GitHub Repository Analyzer
            </span>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center">
            <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight leading-tight mb-4">
              Is your repo<br /><TypingText />
            </h1>
            <p className="text-lg max-w-lg mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
              Paste any GitHub URL and get an instant contributor-readiness score with actionable fixes.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="w-full flex flex-col gap-3">
            <div className="relative">
              <div className="absolute -inset-0.5 rounded-2xl blur opacity-30"
                style={{ background: "linear-gradient(90deg, #6366F1, #8B5CF6, #A78BFA)" }} />
              <div className="relative">
                <UrlInput onAnalyze={handleAnalyze} loading={loading} />
              </div>
            </div>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5" }}>
                {error}
              </motion.div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="w-full flex flex-col gap-3">
            <p className="text-xs text-center uppercase tracking-widest font-medium" style={{ color: "rgba(255,255,255,0.25)" }}>Try an example</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ perspective: "800px" }}>
              {EXAMPLE_REPOS.map(r => (
                <RepoCard key={r.url} {...r} onClick={() => !loading && handleAnalyze(r.url)} disabled={loading} />
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            className="flex items-center gap-8">
            {[["10+", "Checks run"], ["Real-time", "GitHub data"], ["Free", "No signup"]].map(([val, label]) => (
              <div key={label} className="flex flex-col items-center gap-0.5">
                <span className="text-white font-bold text-sm">{val}</span>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <motion.footer
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="relative z-10 w-full px-6 py-4 text-center"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>ContriFlow — Open source contributor readiness intelligence</p>
      </motion.footer>
    </main>
  );
}