import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Check, Image as ImageIcon, Sparkles } from "lucide-react";
import { completeTask, readDailyLocalSet, writeDailyLocalSet } from "@/utils/roearnData";

export const Route = createFileRoute("/ptc")({
  head: () => ({ meta: [{ title: "PTC Board — RoEarn" }] }),
  component: PTCBoard,
});

const SHORTLINK_DAILY_CAP = 20;
const PTC_DAILY_CAP = 40;
const TOTAL = SHORTLINK_DAILY_CAP + PTC_DAILY_CAP;
const SHORTLINK_PROVIDER_IDS = ["timewall-sl", "lootably-sl", "adgate-sl", "roearn-sl"];

function PTCBoard() {
  const [completed, setCompleted] = useState(new Set());
  const [pending, setPending] = useState(new Set());
  const remaining = TOTAL - completed.size;

  useEffect(() => {
    setCompleted(readDailyLocalSet("roearn-ptc-completed"));
  }, []);

  const claim = async (i, premium) => {
    if (completed.has(i) || pending.has(i)) return;

    setPending((previous) => new Set(previous).add(i));
    const taskCategory = premium ? "shortlink" : "ptc";
    const adPayoutValue = premium ? 0.5 : 0.3;
    const providerId = premium ? SHORTLINK_PROVIDER_IDS[i % SHORTLINK_PROVIDER_IDS.length] : "ptc-board";

    try {
      await completeTask(taskCategory, adPayoutValue, { providerId });
      setCompleted((previous) => {
        const next = new Set(previous).add(i);
        writeDailyLocalSet("roearn-ptc-completed", next);
        return next;
      });
    } catch (error) {
      console.warn("Unable to complete task", error);
    } finally {
      setPending((previous) => {
        const next = new Set(previous);
        next.delete(i);
        return next;
      });
    }
  };

  const renderCard = (i, premium) => {
    const done = completed.has(i);
    const rate = premium ? "0.20" : "0.12";
    return (
      <motion.button
        key={i}
        whileHover={{ scale: done ? 1 : 1.05, y: done ? 0 : -2 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        onClick={() => !done && claim(i, premium)}
        disabled={done || pending.has(i)}
        className={`group relative flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border p-2 text-xs transition-colors ${
          done
            ? "border-accent/30 bg-accent/5 opacity-60"
            : premium
              ? "border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 via-slate-900/50 to-slate-900/40 backdrop-blur-md shadow-[0_0_18px] shadow-yellow-500/20 hover:shadow-yellow-400/40 hover:border-yellow-400/70"
              : "border-white/10 bg-slate-900/40 backdrop-blur-md hover:border-primary/50 hover:bg-slate-900/60"
        }`}
      >
        {premium && !done && (
          <span className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-[9px] font-bold text-slate-900 shadow-[0_0_8px] shadow-yellow-400/60">
            <Sparkles className="h-2.5 w-2.5" />
          </span>
        )}
        {done ? (
          <div className="grid h-9 w-9 place-items-center rounded-full bg-accent/20 text-accent glow-emerald">
            <Check className="h-5 w-5" />
          </div>
        ) : (
          <div
            className={`grid h-9 w-9 place-items-center rounded-lg ${premium ? "bg-yellow-500/10 text-yellow-300" : "bg-white/5 text-muted-foreground group-hover:text-primary"}`}
          >
            <ImageIcon className="h-5 w-5" />
          </div>
        )}
        <div className="font-medium text-foreground/80">
          {premium ? "Premium Link" : "Ad"} #{premium ? i + 1 : i - SHORTLINK_DAILY_CAP + 1}
        </div>
        <div
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            done
              ? "bg-white/5 text-muted-foreground"
              : "bg-accent/15 text-accent shadow-[0_0_10px] shadow-accent/30"
          }`}
        >
          {rate} R$
        </div>
      </motion.button>
    );
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Available Paid-To-Click Ads
          </h1>
          <p className="mt-2 text-muted-foreground">
            Click each ad, view for 12 seconds, get paid instantly.
          </p>
        </div>
        <div className="glass-card px-4 py-2.5 text-sm">
          Available Today:{" "}
          <span className="text-accent font-bold">
            {remaining} / {TOTAL}
          </span>
        </div>
      </header>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-yellow-300" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-yellow-300/90">
            Premium Tasks · 0.20 R$ each
          </h2>
          <span className="ml-auto text-xs text-muted-foreground">High-CPM shortlink network</span>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {Array.from({ length: SHORTLINK_DAILY_CAP }).map((_, i) => renderCard(i, true))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Standard Tasks · 0.12 R$ each
          </h2>
          <span className="ml-auto text-xs text-muted-foreground">Programmatic banner slots</span>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {Array.from({ length: PTC_DAILY_CAP }).map((_, i) => renderCard(SHORTLINK_DAILY_CAP + i, false))}
        </div>
      </section>
    </div>
  );
}
