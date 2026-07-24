import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { RobuxIcon } from "@/components/RobuxIcon";
import { CheckCircle2, TrendingUp, Zap, Trophy, Crown, Sparkles } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { AdEpochContext } from "@/components/AppLayout";
import { AdSlot } from "@/components/AdSlot";
import { fetchDailyCompletionCounts, fetchUserBalance, getCurrentUserId } from "@/utils/roearnData";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — RoEarn" },
      { name: "description", content: "Track your daily Robux grind, streaks and payouts." },
    ],
  }),
  component: Dashboard,
});

function Ring({ value, max }) {
  const pct = Math.min(1, value / max);
  const r = 70;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative flex h-48 w-48 items-center justify-center">
      <svg className="h-48 w-48 -rotate-90" viewBox="0 0 160 160">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={r} strokeWidth="10" fill="none" className="stroke-white/5" />
        <motion.circle
          cx="80"
          cy="80"
          r={r}
          strokeWidth="10"
          fill="none"
          stroke="url(#ring-grad)"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          style={{ filter: "drop-shadow(0 0 8px rgba(99,102,241,0.6))" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold tracking-tight">
          {value} <span className="text-muted-foreground text-xl">/ {max}</span>
        </div>
        <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
          Tasks Completed
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value, max, color }) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-accent" />
          <span className="font-medium">{label}:</span>
          <span className="text-muted-foreground">
            {value} / {max}
          </span>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

const leaders = [
  { name: "CrownGrind", tag: "@crown", robux: 4820, icon: Crown, tone: "text-yellow-300" },
  { name: "NeonSprint", tag: "@neon", robux: 3915, icon: Trophy, tone: "text-slate-200" },
  { name: "PixelHarvest", tag: "@pixel", robux: 3204, icon: Sparkles, tone: "text-amber-400" },
];

function Dashboard() {
  const [dailyCounts, setDailyCounts] = useState({ ptc: 0, shortlink: 0, passive_ad: 0 });
  const [balance, setBalance] = useState(0);
  const ptcCompleted = dailyCounts.ptc;
  const shortlinkCompleted = dailyCounts.shortlink;
  const passiveAdImpressions = dailyCounts.passive_ad;
  const completed = ptcCompleted + shortlinkCompleted + passiveAdImpressions;
  const totalDailyTaskCap = 40 + 20 + 30;
  const claimed = 0;
  const adEpoch = useContext(AdEpochContext);

  useEffect(() => {
    let mounted = true;

    async function loadDashboardState() {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const [counts, userBalance] = await Promise.all([
        fetchDailyCompletionCounts(userId),
        fetchUserBalance(userId),
      ]);

      if (!mounted) return;
      setDailyCounts(counts);
      setBalance(userBalance);
    }

    loadDashboardState();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your Daily Grind Overview</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome back, <span className="text-foreground font-medium">BloxCrusher99</span>
        </p>
      </header>

      {/* Mobile square ad directly below Daily Grind Overview */}
      <div className="md:hidden flex justify-center mt-2 mb-4">
        <AdSlot label="300×250 Mobile Banner" epoch={adEpoch} className="h-[250px] w-[300px]" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div whileHover={{ y: -2 }} className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Daily Progress
            </h2>
            <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent">
              <Zap className="h-3 w-3" /> Live
            </span>
          </div>
          <div className="mt-6 flex flex-col items-center gap-8 sm:flex-row">
            <Ring value={completed} max={totalDailyTaskCap} />
            <div className="flex-1 space-y-5 w-full">
              <Bar
                label="PTC Ads"
                value={ptcCompleted}
                max={40}
                color="linear-gradient(90deg, #6366F1, #8b5cf6)"
              />
              <Bar
                label="Shortlinks"
                value={shortlinkCompleted}
                max={20}
                color="linear-gradient(90deg, #10B981, #34d399)"
              />
              <Bar
                label="Banner/Video Ads"
                value={passiveAdImpressions}
                max={30}
                color="linear-gradient(90deg, #10B981, #34d399)"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="glass-card relative overflow-hidden p-6 glow-indigo"
        >
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Total Robux Balance
          </h2>
          <div className="mt-6 flex items-center gap-4">
            <RobuxIcon size={64} />
            <div className="text-5xl font-bold tracking-tight tabular-nums">
              {balance.toFixed(2)}
            </div>
          </div>
          <div className="mt-6 border-t border-white/5 pt-4 text-sm text-muted-foreground">
            Claimed R$ Today:{" "}
            <span className="text-accent font-semibold">{claimed.toFixed(2)}</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-accent">
            <TrendingUp className="h-3.5 w-3.5" /> Start grinding to climb the board
          </div>
        </motion.div>
      </div>

      {/* Second mobile square ad contextually positioned between sections */}
      <div className="md:hidden flex justify-center mt-2 mb-4">
        <AdSlot label="300×250 Mobile Banner 2" epoch={adEpoch} className="h-[250px] w-[300px]" />
      </div>

      {/* Leaderboard + Affiliate frame */}
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div whileHover={{ y: -2 }} className="glass-card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Trophy className="h-4 w-4 text-accent" /> Top Grind-Masters This Week
            </h2>
            <span className="text-xs text-muted-foreground">Resets Sunday 23:59 UTC</span>
          </div>
          <ol className="space-y-2">
            {leaders.map((l, i) => (
              <motion.li
                key={l.name}
                whileHover={{ x: 3 }}
                className="flex items-center gap-4 rounded-xl border border-white/5 bg-slate-950/40 p-3.5"
              >
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 ${l.tone}`}
                >
                  <l.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="text-xs text-muted-foreground">#{i + 1}</span>
                    {l.name}
                  </div>
                  <div className="text-xs text-muted-foreground">{l.tag}</div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5 text-sm font-bold text-accent shadow-[0_0_10px] shadow-accent/20">
                  <RobuxIcon size={14} /> {l.robux.toLocaleString()}
                </div>
              </motion.li>
            ))}
          </ol>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="glass-card relative overflow-hidden p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/10" />
          <div className="relative">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" /> Sponsored
            </div>
            <h3 className="text-lg font-bold">Premium Affiliate Offer</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Unlock 2x Robux multipliers with our featured partner network — limited slots
              available.
            </p>
            <div className="mt-4 aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900">
              <div className="grid h-full place-items-center text-xs text-muted-foreground">
                [ 300×250 Ad Frame ]
              </div>
            </div>
            <button className="mt-4 w-full rounded-lg bg-gradient-to-r from-primary to-indigo-500 px-4 py-2.5 text-sm font-semibold shadow-[0_0_20px] shadow-primary/30">
              Activate 2x Multiplier
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
