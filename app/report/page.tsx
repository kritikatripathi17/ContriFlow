"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { AnalysisReport, CheckResult, Grade } from "@/types";

// ── Extended types ─────────────────────────────────────────────────────────
interface Language { name: string; bytes: number; pct: number; }
interface Contributor { login: string; avatarUrl: string; contributions: number; htmlUrl: string; }
interface CommitWeek { week: number; total: number; }
interface HeatmapWeek { week: number; count: number; }

interface ExtendedReport extends AnalysisReport {
  languages?: Language[];
  commitActivity?: CommitWeek[];
  contributors?: Contributor[];
  avgResolutionDays?: number | null;
  heatmap?: HeatmapWeek[];
}

// ── Language colors ────────────────────────────────────────────────────────
const LANG_COLORS: Record<string, string> = {
  JavaScript: "#F7DF1E", TypeScript: "#3178C6", Python: "#3572A5", Java: "#B07219",
  "C++": "#F34B7D", C: "#555555", Ruby: "#701516", Go: "#00ADD8", Rust: "#DEA584",
  Swift: "#FA7343", Kotlin: "#A97BFF", PHP: "#4F5D95", CSS: "#563D7C", HTML: "#E34C26",
  Shell: "#89E051", Vue: "#41B883", Dart: "#00B4AB", Scala: "#C22D40",
};
function langColor(name: string) { return LANG_COLORS[name] ?? "#6366F1"; }

// ── Particle background ────────────────────────────────────────────────────
function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const colors = ["#6EE7B7","#818CF8","#F472B6","#FCD34D","#60A5FA","#A78BFA"];
    const particles = Array.from({ length: 35 }, () => ({
      x: Math.random()*canvas.width, y: Math.random()*canvas.height,
      vx: (Math.random()-0.5)*0.3, vy: (Math.random()-0.5)*0.3,
      r: Math.random()*2.5+1, color: colors[Math.floor(Math.random()*colors.length)],
      phase: Math.random()*Math.PI*2,
    }));
    let t = 0;
    const draw = () => {
      t += 0.008; ctx.clearRect(0,0,canvas.width,canvas.height);
      particles.forEach(p => {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>canvas.width) p.vx*=-1;
        if(p.y<0||p.y>canvas.height) p.vy*=-1;
        const pulse = Math.sin(t*2+p.phase)*0.4+0.6;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r*pulse,0,Math.PI*2);
        ctx.fillStyle=p.color+"80"; ctx.shadowBlur=8; ctx.shadowColor=p.color;
        ctx.fill(); ctx.shadowBlur=0;
      });
      for(let i=0;i<particles.length;i++) for(let j=i+1;j<particles.length;j++) {
        const dx=particles[i].x-particles[j].x, dy=particles[i].y-particles[j].y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<120){ ctx.beginPath(); ctx.moveTo(particles[i].x,particles[i].y);
          ctx.lineTo(particles[j].x,particles[j].y);
          ctx.strokeStyle=`rgba(139,92,246,${(1-dist/120)*0.15})`; ctx.lineWidth=0.5; ctx.stroke(); }
      }
      animRef.current=requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{zIndex:0,opacity:0.5}}/>;
}

function ConfettiParticle({ delay }: { delay: number }) {
  const colors = ["#6EE7B7","#818CF8","#F472B6","#FCD34D","#34D399","#A78BFA"];
  const color = colors[Math.floor(Math.random()*colors.length)];
  return (
    <motion.div className="fixed pointer-events-none z-50"
      style={{left:`${Math.random()*100}%`,top:-20,width:Math.random()*8+4,height:Math.random()*8+4,background:color,borderRadius:Math.random()>0.5?"50%":"2px"}}
      initial={{y:-20,opacity:1,rotate:0}} animate={{y:"110vh",opacity:[1,1,0],rotate:Math.random()*720-360}}
      transition={{duration:2.5+Math.random()*1.5,delay,ease:"easeIn"}}/>
  );
}

function AnimatedNumber({ target }: { target: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now()-start)/1800,1);
      setValue(Math.round((1-Math.pow(1-p,3))*target));
      if (p<1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target]);
  return <span ref={ref}>{value}</span>;
}

function GradeRing({ pct, grade }: { pct: number; grade: Grade }) {
  const r=72, stroke=9, nr=r-stroke/2, circ=2*Math.PI*nr;
  const [offset, setOffset] = useState(circ);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => { if(!inView) return; setTimeout(()=>setOffset(circ-(pct/100)*circ),300); }, [inView,pct,circ]);
  const gc: Record<string,{s:string;t:string;glow:string}> = {
    A:{s:"#10B981",t:"#6EE7B7",glow:"rgba(16,185,129,0.6)"}, B:{s:"#6366F1",t:"#A5B4FC",glow:"rgba(99,102,241,0.6)"},
    C:{s:"#F59E0B",t:"#FCD34D",glow:"rgba(245,158,11,0.6)"}, D:{s:"#F97316",t:"#FDBA74",glow:"rgba(249,115,22,0.6)"},
    F:{s:"#EF4444",t:"#FCA5A5",glow:"rgba(239,68,68,0.6)"},
  };
  const c = gc[grade]??gc["F"];
  return (
    <div ref={ref} className="relative flex items-center justify-center" style={{width:r*2,height:r*2}}>
      <svg width={r*2} height={r*2} style={{transform:"rotate(-90deg)"}}>
        <circle cx={r} cy={r} r={nr} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke}/>
        <circle cx={r} cy={r} r={nr} fill="none" stroke={c.s} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{transition:"stroke-dashoffset 1.8s cubic-bezier(0.25,0.46,0.45,0.94)",filter:`drop-shadow(0 0 10px ${c.s})`}}/>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-5xl font-black" style={{color:c.t,textShadow:`0 0 30px ${c.glow}`}}>{grade}</span>
        <span className="text-xs font-medium" style={{color:"rgba(255,255,255,0.35)"}}>grade</span>
      </div>
    </div>
  );
}

// ── Contribution Heatmap ───────────────────────────────────────────────────
function ContributionHeatmap({ heatmap }: { heatmap: HeatmapWeek[] }) {
  if (!heatmap || heatmap.length === 0) return null;
  const max = Math.max(...heatmap.map(w => w.count), 1);
  const getColor = (count: number) => {
    if (count === 0) return "rgba(255,255,255,0.05)";
    const intensity = count / max;
    if (intensity < 0.25) return "rgba(16,185,129,0.25)";
    if (intensity < 0.5) return "rgba(16,185,129,0.45)";
    if (intensity < 0.75) return "rgba(16,185,129,0.7)";
    return "#10B981";
  };
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return (
    <div className="rounded-2xl p-5" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
      <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:"rgba(255,255,255,0.4)"}}>
        📅 Contribution Activity — Last 52 Weeks
      </h3>
      <div className="flex gap-1 flex-wrap">
        {heatmap.map((week, i) => {
          const date = new Date(week.week * 1000);
          const month = months[date.getMonth()];
          return (
            <div key={i} className="relative group">
              <div className="w-3 h-3 rounded-sm transition-all duration-200 group-hover:scale-125"
                style={{background: getColor(week.count)}} />
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 hidden group-hover:block px-2 py-1 rounded-lg text-xs whitespace-nowrap"
                style={{background:"rgba(0,0,0,0.8)",color:"white",border:"1px solid rgba(255,255,255,0.1)"}}>
                {month} {date.getDate()}: {week.count} commits
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs" style={{color:"rgba(255,255,255,0.3)"}}>Less</span>
        {[0,0.25,0.5,0.75,1].map((v,i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{background: getColor(v*max)}}/>
        ))}
        <span className="text-xs" style={{color:"rgba(255,255,255,0.3)"}}>More</span>
      </div>
    </div>
  );
}

// ── Commit Activity Bar Chart ──────────────────────────────────────────────
function CommitActivityChart({ commitActivity }: { commitActivity: CommitWeek[] }) {
  if (!commitActivity || commitActivity.length === 0) return null;
  const last26 = commitActivity.slice(-26);
  const max = Math.max(...last26.map(w => w.total), 1);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="rounded-2xl p-5" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
      <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:"rgba(255,255,255,0.4)"}}>
        📊 Commit Activity — Last 26 Weeks
      </h3>
      <div className="flex items-end gap-1 h-20">
        {last26.map((week, i) => {
          const heightPct = (week.total / max) * 100;
          const date = new Date(week.week * 1000);
          return (
            <div key={i} className="relative group flex-1 flex flex-col items-center justify-end h-full">
              <motion.div
                className="w-full rounded-t-sm"
                style={{background: week.total > 0 ? "linear-gradient(180deg,#818CF8,#6366F1)" : "rgba(255,255,255,0.05)", minHeight: 2}}
                initial={{height: 0}}
                animate={inView ? {height: `${Math.max(heightPct, 2)}%`} : {}}
                transition={{delay: i * 0.02, duration: 0.5, ease: "easeOut"}}
              />
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10 hidden group-hover:block px-2 py-1 rounded-lg text-xs whitespace-nowrap"
                style={{background:"rgba(0,0,0,0.8)",color:"white",border:"1px solid rgba(255,255,255,0.1)"}}>
                {date.toLocaleDateString("en",{month:"short",day:"numeric"})}: {week.total}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Language Donut Chart ───────────────────────────────────────────────────
function LanguageChart({ languages }: { languages: Language[] }) {
  if (!languages || languages.length === 0) return null;
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const size = 120, cx = 60, cy = 60, r = 45, strokeW = 18;
  const circ = 2 * Math.PI * r;
  let cumPct = 0;
  return (
    <div ref={ref} className="rounded-2xl p-5" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
      <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:"rgba(255,255,255,0.4)"}}>
        🌐 Language Breakdown
      </h3>
      <div className="flex items-center gap-6">
        <svg width={size} height={size} className="flex-shrink-0" style={{transform:"rotate(-90deg)"}}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeW}/>
          {languages.map((lang, i) => {
            const dash = (lang.pct / 100) * circ;
            const gap = circ - dash;
            const offset = circ - (cumPct / 100) * circ;
            cumPct += lang.pct;
            return (
              <motion.circle key={lang.name} cx={cx} cy={cy} r={r} fill="none"
                stroke={langColor(lang.name)} strokeWidth={strokeW}
                strokeDasharray={`${dash} ${gap}`} strokeDashoffset={offset}
                initial={{opacity:0}} animate={inView?{opacity:1}:{}}
                transition={{delay: i * 0.1, duration: 0.5}}/>
            );
          })}
        </svg>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {languages.slice(0,6).map(lang => (
            <div key={lang.name} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background: langColor(lang.name)}}/>
              <span className="text-xs text-white truncate flex-1">{lang.name}</span>
              <span className="text-xs font-bold flex-shrink-0" style={{color:"rgba(255,255,255,0.5)"}}>{lang.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Top Contributors ───────────────────────────────────────────────────────
function ContributorsList({ contributors }: { contributors: Contributor[] }) {
  if (!contributors || contributors.length === 0) return null;
  const max = contributors[0]?.contributions ?? 1;
  return (
    <div className="rounded-2xl p-5" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
      <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:"rgba(255,255,255,0.4)"}}>
        👥 Top Contributors
      </h3>
      <div className="flex flex-col gap-2.5">
        {contributors.slice(0,8).map((c, i) => (
          <motion.a key={c.login} href={c.htmlUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 group"
            initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}}
            transition={{delay: i*0.06}}>
            <span className="text-xs w-4 text-right flex-shrink-0" style={{color:"rgba(255,255,255,0.25)"}}>{i+1}</span>
            <img src={c.avatarUrl} alt={c.login} className="w-7 h-7 rounded-full flex-shrink-0"
              style={{border:"1px solid rgba(255,255,255,0.1)"}}/>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">{c.login}</p>
              <div className="h-1 rounded-full mt-1 overflow-hidden" style={{background:"rgba(255,255,255,0.06)"}}>
                <motion.div className="h-full rounded-full"
                  style={{background:"linear-gradient(90deg,#6366F1,#A78BFA)"}}
                  initial={{width:0}} animate={{width:`${(c.contributions/max)*100}%`}}
                  transition={{delay:i*0.06+0.2,duration:0.7}}/>
              </div>
            </div>
            <span className="text-xs font-bold flex-shrink-0" style={{color:"rgba(255,255,255,0.4)"}}>{c.contributions}</span>
          </motion.a>
        ))}
      </div>
    </div>
  );
}

// ── Issue Resolution Time ──────────────────────────────────────────────────
function IssueResolutionCard({ days }: { days: number | null | undefined }) {
  if (days === null || days === undefined) return null;
  const isGood = days <= 7;
  const isOk = days <= 30;
  const color = isGood ? "#10B981" : isOk ? "#F59E0B" : "#EF4444";
  const label = isGood ? "Excellent" : isOk ? "Average" : "Needs work";
  return (
    <div className="rounded-2xl p-5" style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${color}25`}}>
      <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{color:"rgba(255,255,255,0.4)"}}>
        ⏱️ Avg Issue Resolution Time
      </h3>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-black" style={{color}}>{days}</span>
        <span className="text-sm mb-1" style={{color:"rgba(255,255,255,0.4)"}}>days</span>
        <span className="text-xs px-2 py-1 rounded-full mb-1 font-semibold" style={{background:`${color}20`,color}}>{label}</span>
      </div>
      <p className="text-xs mt-2" style={{color:"rgba(255,255,255,0.3)"}}>
        {isGood ? "Issues are resolved quickly — great maintainer responsiveness!" : isOk ? "Moderate response time. Aim for under 7 days." : "Issues take too long. Try to respond within a week."}
      </p>
    </div>
  );
}

// ── CheckCard ──────────────────────────────────────────────────────────────
function CheckCard({ check, index, repoName }: { check: CheckResult; index: number; repoName: string }) {
  const [open, setOpen] = useState(false);
  const [loadingFix, setLoadingFix] = useState(false);
  const [aiFix, setAiFix] = useState<string | null>(null);
  const [fixError, setFixError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const pct = check.maxScore > 0 ? (check.score/check.maxScore)*100 : 0;

  async function getAiFix() {
    setLoadingFix(true); setFixError(null); setAiFix(null);
    try {
      const res = await fetch("/api/fix", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({checkId:check.id,checkLabel:check.label,repoName,detail:check.detail}) });
      const data = await res.json();
      if (!res.ok) { setFixError(`Server error ${res.status}: ${data.error??"Unknown error"}`); return; }
      if (data.success && data.fix) setAiFix(data.fix);
      else setFixError(data.error??"No response received from AI");
    } catch(err) { setFixError("Network error"); console.error(err); }
    finally { setLoadingFix(false); }
  }

  function copyFix() {
    if (aiFix) { navigator.clipboard.writeText(aiFix); setCopied(true); setTimeout(()=>setCopied(false),2000); }
  }

  return (
    <motion.div ref={ref} initial={{opacity:0,x:-24}} animate={inView?{opacity:1,x:0}:{}}
      transition={{duration:0.45,delay:index*0.06,ease:[0.25,0.46,0.45,0.94]}}
      className="rounded-2xl overflow-hidden"
      style={{background:check.passed?"rgba(16,185,129,0.06)":"rgba(239,68,68,0.06)",border:`1px solid ${check.passed?"rgba(16,185,129,0.2)":"rgba(239,68,68,0.15)"}`}}>
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none" onClick={()=>setOpen(!open)}>
        <motion.div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
          style={{background:check.passed?"rgba(16,185,129,0.2)":"rgba(239,68,68,0.2)",color:check.passed?"#6EE7B7":"#FCA5A5",boxShadow:`0 0 16px ${check.passed?"rgba(16,185,129,0.25)":"rgba(239,68,68,0.25)"}`}}
          initial={{scale:0}} animate={inView?{scale:1}:{}} transition={{delay:index*0.06+0.15,type:"spring",stiffness:280}}>
          {check.passed?"✓":"✗"}
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate mb-2">{check.label}</p>
          <div className="h-1.5 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.06)"}}>
            <motion.div className="h-full rounded-full"
              style={{background:check.passed?"linear-gradient(90deg,#10B981,#34D399)":"linear-gradient(90deg,#EF4444,#F87171)",boxShadow:`0 0 8px ${check.passed?"rgba(16,185,129,0.4)":"rgba(239,68,68,0.4)"}`}}
              initial={{width:0}} animate={inView?{width:`${pct}%`}:{}}
              transition={{delay:index*0.06+0.25,duration:0.9,ease:"easeOut"}}/>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-sm font-bold" style={{color:check.passed?"#6EE7B7":"#FCA5A5"}}>{check.score}</span>
          <span className="text-xs" style={{color:"rgba(255,255,255,0.25)"}}>/{check.maxScore}</span>
        </div>
        <motion.span animate={{rotate:open?180:0}} transition={{duration:0.2}}
          className="text-xs flex-shrink-0" style={{color:"rgba(255,255,255,0.25)"}}>▼</motion.span>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}}
            exit={{height:0,opacity:0}} transition={{duration:0.25}} className="overflow-hidden">
            <div className="px-5 pb-5 pt-3 flex flex-col gap-3" style={{borderTop:"1px solid rgba(255,255,255,0.05)"}}>
              <p className="text-sm leading-relaxed" style={{color:"rgba(255,255,255,0.5)"}}>{check.detail}</p>
              {check.fixSuggestion && (
                <div className="flex items-start gap-2.5 rounded-xl px-4 py-3"
                  style={{background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.18)"}}>
                  <span className="text-sm mt-0.5 flex-shrink-0">💡</span>
                  <p className="text-xs leading-relaxed" style={{color:"#A5B4FC"}}>{check.fixSuggestion}</p>
                </div>
              )}
              {!check.passed && (
                <div className="flex flex-col gap-3">
                  {!aiFix && (
                    <motion.button whileHover={{scale:loadingFix?1:1.02}} whileTap={{scale:loadingFix?1:0.98}}
                      onClick={getAiFix} disabled={loadingFix}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold w-full"
                      style={{background:"linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.25))",border:"1px solid rgba(99,102,241,0.5)",color:"#C4B5FD",cursor:loadingFix?"not-allowed":"pointer",opacity:loadingFix?0.8:1}}>
                      {loadingFix?(<><motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:0.8,ease:"linear"}}
                        className="w-4 h-4 rounded-full border-2 border-transparent flex-shrink-0" style={{borderTopColor:"#C4B5FD"}}/><span>Generating fix with AI...</span></>)
                        :<span>✨ Fix it for me with AI</span>}
                    </motion.button>
                  )}
                  {fixError && (
                    <div className="rounded-xl px-4 py-3 text-xs" style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",color:"#FCA5A5"}}>
                      ⚠️ {fixError}<button onClick={getAiFix} className="ml-2 underline opacity-70 hover:opacity-100">Try again</button>
                    </div>
                  )}
                  {aiFix && (
                    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.3}} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{color:"#A5B4FC"}}>✨ AI Generated Fix</span>
                        <div className="flex gap-2">
                          <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={copyFix}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium"
                            style={{background:copied?"rgba(16,185,129,0.2)":"rgba(99,102,241,0.2)",color:copied?"#6EE7B7":"#A5B4FC",border:`1px solid ${copied?"rgba(16,185,129,0.35)":"rgba(99,102,241,0.35)"}`}}>
                            {copied?"✓ Copied!":"📋 Copy"}
                          </motion.button>
                          <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                            onClick={()=>{setAiFix(null);setFixError(null);}}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium"
                            style={{background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.4)",border:"1px solid rgba(255,255,255,0.1)"}}>
                            ↺ Regenerate
                          </motion.button>
                        </div>
                      </div>
                      <div className="rounded-xl p-4 text-xs leading-relaxed overflow-auto max-h-80"
                        style={{background:"rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",fontFamily:"monospace",whiteSpace:"pre-wrap",lineHeight:"1.7"}}>
                        {aiFix}
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatCard({ icon, value, label, color }: { icon:string; value:string|number; label:string; color:string }) {
  return (
    <motion.div whileHover={{scale:1.04,y:-2}} className="flex flex-col items-center gap-1.5 px-4 py-4 rounded-2xl"
      style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${color}20`}}>
      <span className="text-xl">{icon}</span>
      <span className="text-base font-black text-white tabular-nums">{value}</span>
      <span className="text-xs uppercase tracking-widest" style={{color:"rgba(255,255,255,0.3)"}}>{label}</span>
    </motion.div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ReportPage() {
  const router = useRouter();
  const [report, setReport] = useState<ExtendedReport | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [pieces] = useState(() => Array.from({length:80},(_,i)=>i));

  useEffect(() => {
    const raw = sessionStorage.getItem("contriflow_report");
    if (!raw) { router.push("/"); return; }
    try {
      const parsed: ExtendedReport = JSON.parse(raw);
      setReport(parsed);
      if (parsed.grade==="A") {
        setTimeout(()=>setConfetti(true),700);
        setTimeout(()=>setConfetti(false),4200);
      }
    } catch { router.push("/"); }
  }, [router]);

  if (!report) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:"#050816"}}>
      <motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:1,ease:"linear"}}
        className="w-10 h-10 rounded-full border-2 border-transparent" style={{borderTopColor:"#6EE7B7"}}/>
    </div>
  );

  const pct = Math.round((report.totalScore/report.maxScore)*100);
  const passed = report.checks.filter(c=>c.passed).length;
  const total = report.checks.length;

  const gradeBg: Record<string,string> = {
    A:"linear-gradient(135deg,rgba(16,185,129,0.12),rgba(52,211,153,0.04))",
    B:"linear-gradient(135deg,rgba(99,102,241,0.12),rgba(167,139,250,0.04))",
    C:"linear-gradient(135deg,rgba(245,158,11,0.12),rgba(252,211,77,0.04))",
    D:"linear-gradient(135deg,rgba(249,115,22,0.12),rgba(251,146,60,0.04))",
    F:"linear-gradient(135deg,rgba(239,68,68,0.12),rgba(252,165,165,0.04))",
  };
  const gradeBorder: Record<string,string> = {
    A:"rgba(16,185,129,0.25)",B:"rgba(99,102,241,0.25)",
    C:"rgba(245,158,11,0.25)",D:"rgba(249,115,22,0.25)",F:"rgba(239,68,68,0.25)",
  };
  const gradeMsg: Record<string,string> = {
    A:"🎉 Excellent! This repo is contributor-ready.",
    B:"👍 Good job — a few small improvements needed.",
    C:"⚠️ Decent start, but contributors may struggle.",
    D:"🔧 Needs real work before accepting contributors.",
    F:"🚨 Not ready — missing critical contributor docs.",
  };

  return (
    <div className="min-h-screen" style={{background:"#050816",fontFamily:"'Inter',system-ui,sans-serif"}}>
      <ParticleBackground/>
      <AnimatePresence>
        {confetti && pieces.map(i=><ConfettiParticle key={i} delay={i*0.02}/>)}
      </AnimatePresence>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
        <motion.button initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.1}}
          onClick={()=>router.push("/")}
          className="flex items-center gap-2 text-sm mb-10 group" style={{color:"rgba(255,255,255,0.35)"}}>
          <motion.span whileHover={{x:-3}} transition={{type:"spring",stiffness:400}}>←</motion.span>
          <span className="group-hover:text-white transition-colors">Analyze another repo</span>
        </motion.button>

        {/* Hero card */}
        <motion.div initial={{opacity:0,y:28}} animate={{opacity:1,y:0}}
          transition={{duration:0.55,ease:[0.25,0.46,0.45,0.94]}}
          className="rounded-3xl p-8 mb-5"
          style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",boxShadow:"0 0 60px rgba(99,102,241,0.08)"}}>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
            <div className="flex-shrink-0"><GradeRing pct={pct} grade={report.grade}/></div>
            <div className="flex-1 text-center sm:text-left w-full">
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                {report.repoData.avatarUrl && (
                  <img src={report.repoData.avatarUrl} alt="" className="w-6 h-6 rounded-md" style={{border:"1px solid rgba(255,255,255,0.1)"}}/>
                )}
                <p className="text-xs uppercase tracking-widest" style={{color:"rgba(255,255,255,0.3)"}}>
                  {report.repoData.fullName.split("/")[0]}
                </p>
              </div>
              <h1 className="text-2xl font-black text-white mb-1 break-all">{report.repoData.fullName.split("/")[1]}</h1>
              {report.repoData.description && (
                <p className="text-sm mb-5 leading-relaxed" style={{color:"rgba(255,255,255,0.35)"}}>{report.repoData.description}</p>
              )}
              <div className="flex items-baseline gap-1 justify-center sm:justify-start mb-4">
                <span className="text-6xl font-black" style={{color:"#F8FAFC"}}><AnimatedNumber target={pct}/></span>
                <span className="text-2xl font-bold" style={{color:"rgba(255,255,255,0.25)"}}>/100</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden mb-5" style={{background:"rgba(255,255,255,0.06)"}}>
                <motion.div className="h-full rounded-full"
                  style={{background:"linear-gradient(90deg,#6366F1,#8B5CF6,#A78BFA)",boxShadow:"0 0 12px rgba(139,92,246,0.5)"}}
                  initial={{width:0}} animate={{width:`${pct}%`}}
                  transition={{duration:1.8,delay:0.4,ease:[0.25,0.46,0.45,0.94]}}/>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <StatCard icon="⭐" value={report.repoData.stars.toLocaleString()} label="Stars" color="#FCD34D"/>
                <StatCard icon="🍴" value={report.repoData.forks.toLocaleString()} label="Forks" color="#60A5FA"/>
                <StatCard icon="📄" value={report.repoData.license??"None"} label="License" color="#6EE7B7"/>
                <StatCard icon="✅" value={`${passed}/${total}`} label="Checks" color="#A78BFA"/>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Grade banner */}
        <motion.div initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} transition={{delay:0.35}}
          className="rounded-2xl px-5 py-4 mb-6 flex items-center justify-between gap-4"
          style={{background:gradeBg[report.grade]??gradeBg["F"],border:`1px solid ${gradeBorder[report.grade]??gradeBorder["F"]}`}}>
          <div>
            <p className="text-sm font-bold text-white">{gradeMsg[report.grade]}</p>
            <p className="text-xs mt-0.5" style={{color:"rgba(255,255,255,0.35)"}}>{passed} of {total} checks passed</p>
          </div>
          <a href={report.repoData.htmlUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs px-3 py-2 rounded-xl flex-shrink-0 font-medium"
            style={{background:"rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.6)",border:"1px solid rgba(255,255,255,0.1)"}}>
            GitHub ↗
          </a>
        </motion.div>

        {/* ── Analytics Section ── */}
        <motion.h2 initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5}}
          className="text-xs font-semibold uppercase tracking-widest mb-4"
          style={{color:"rgba(255,255,255,0.3)"}}>
          📈 Repository Analytics
        </motion.h2>

        <div className="flex flex-col gap-4 mb-8">
          {report.heatmap && report.heatmap.length > 0 && <ContributionHeatmap heatmap={report.heatmap}/>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {report.languages && report.languages.length > 0 && <LanguageChart languages={report.languages}/>}
            {report.avgResolutionDays !== undefined && <IssueResolutionCard days={report.avgResolutionDays}/>}
          </div>
          {report.commitActivity && report.commitActivity.length > 0 && <CommitActivityChart commitActivity={report.commitActivity}/>}
          {report.contributors && report.contributors.length > 0 && <ContributorsList contributors={report.contributors}/>}
        </div>

        {/* Checks */}
        <motion.h2 initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.6}}
          className="text-xs font-semibold uppercase tracking-widest mb-4"
          style={{color:"rgba(255,255,255,0.3)"}}>
          Contributor Readiness Checks
        </motion.h2>

        <div className="flex flex-col gap-2.5">
          {report.checks.map((check,i) => (
            <CheckCard key={check.id} check={check} index={i} repoName={report.repoData.fullName}/>
          ))}
        </div>

        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1}}
          className="flex justify-center pt-10 pb-6">
          <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.97}}
            onClick={()=>router.push("/")}
            className="px-8 py-3 rounded-2xl text-sm font-semibold text-white"
            style={{background:"linear-gradient(135deg,#6366F1,#8B5CF6)",boxShadow:"0 0 30px rgba(99,102,241,0.3)"}}>
            Analyze another repository
          </motion.button>
        </motion.div>

        <p className="text-center text-xs pb-6" style={{color:"rgba(255,255,255,0.15)"}}>
          Built with ContriFlow • Powered by GitHub API & AI
        </p>
      </div>
    </div>
  );
}