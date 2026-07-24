import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { Play, Check, Bell, X } from "lucide-react";
import { RobuxIcon } from "@/components/RobuxIcon";
import { completeTask, readDailyLocalSet, writeDailyLocalSet } from "@/utils/roearnData";

export const Route = createFileRoute("/watch")({
  head: () => ({ meta: [{ title: "Watch to Earn — RoEarn" }] }),
  component: WatchToEarn,
});

function WatchToEarn() {
  const [watched, setWatched] = useState(new Set());
  const [pending, setPending] = useState(new Set());
  const [toast, setToast] = useState(true);

  useEffect(() => {
    setWatched(readDailyLocalSet("roearn-video-completed"));
    const t = setTimeout(() => setToast(false), 8000);
    return () => clearTimeout(t);
  }, []);

  const claimVideo = async (i) => {
    if (watched.has(i) || pending.has(i)) return;

    setPending((previous) => new Set(previous).add(i));
    try {
      await completeTask("passive_ad", 0.1);
      setWatched((previous) => {
        const next = new Set(previous).add(i);
        writeDailyLocalSet("roearn-video-completed", next);
        return next;
      });
    } catch (error) {
      console.warn("Unable to complete video placement", error);
    } finally {
      setPending((previous) => {
        const next = new Set(previous);
        next.delete(i);
        return next;
      });
    }
  };

  return (
    <div className="relative">
      <div className="space-y-10">
        <header>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Watch Premium Videos & Complete Offers
          </h1>
          <p className="mt-2 text-muted-foreground">
            30 sponsored spots plus high-value offerwall tasks.
          </p>
        </header>

        {/* Video slots */}
        <section className="glass-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">30 Premium Video Slots</h2>
            <div className="text-xs text-muted-foreground">Resets in 04:12:39</div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
            {Array.from({ length: 30 }).map((_, i) => {
              const done = watched.has(i);
              return (
                <motion.button
                  key={i}
                  whileHover={{ scale: done ? 1 : 1.04, y: done ? 0 : -3 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => claimVideo(i)}
                  disabled={done || pending.has(i)}
                  className={`group relative overflow-hidden rounded-xl border ${done ? "border-accent/40 opacity-70" : "border-white/10 hover:border-primary/50"
                    }`}
                >
                  <div
                    className="aspect-video w-full"
                    style={{
                      background: `linear-gradient(135deg, hsl(${(i * 37) % 360} 60% 30%), hsl(${(i * 37 + 60) % 360} 70% 20%))`,
                    }}
                  />

                  <div className="absolute inset-0 grid place-items-center bg-black/40">
                    {done ? (
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-accent/30 text-accent glow-emerald">
                        <Check className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur transition-transform group-hover:scale-110">
                        <Play className="h-5 w-5 fill-current" />
                      </div>
                    )}
                  </div>
                  <div className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur">
                    Video #{i + 1}
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 bg-slate-950/70 px-2.5 py-2 text-xs backdrop-blur">
                    <span className="text-[10px] text-muted-foreground">Watch 15–30s to claim</span>
                    <span className="font-bold text-accent">0.48 R$</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

      </div>
      {/* In-page push / social bar toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 right-4 z-40 flex w-[300px] items-start gap-3 rounded-xl border border-white/10 bg-slate-900/90 p-3 shadow-2xl backdrop-blur-xl"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary">
              <Bell className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold">Sponsored · Push notification</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                Claim your daily bonus spin — 2x Robux multiplier active now!
              </div>
            </div>
            <button
              onClick={() => setToast(false)}
              className="rounded p-1 text-muted-foreground hover:bg-white/5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
