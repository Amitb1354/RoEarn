import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Download, HelpCircle, PlayCircle, ShieldCheck } from "lucide-react";
import { getCurrentUserId } from "@/utils/roearnData";

export const Route = createFileRoute("/offers")({
  head: () => ({ meta: [{ title: "Offerwalls - RoEarn" }] }),
  component: Offerwalls,
});

const fallbackConfig = {
  allowedCategories: ["cpi_mobile_launch", "micro_quiz", "profiler_poll", "short_video"],
  providers: [
    { id: "timewall", name: "TimeWall", iframeUrl: "", categories: ["cpi_mobile_launch", "micro_quiz", "profiler_poll", "short_video"] },
    { id: "lootably", name: "Lootably", iframeUrl: "", categories: ["cpi_mobile_launch", "micro_quiz", "profiler_poll", "short_video"] },
    { id: "adgate", name: "AdGate", iframeUrl: "", categories: ["cpi_mobile_launch", "micro_quiz", "profiler_poll", "short_video"] },
  ],
};

const categoryLabels = {
  cpi_mobile_launch: { icon: Download, label: "Free App Downloads", desc: "Install and launch for 30 seconds" },
  micro_quiz: { icon: HelpCircle, label: "Micro-Quizzes", desc: "Quick quizzes and profiler polls" },
  profiler_poll: { icon: ShieldCheck, label: "Profiler Polls", desc: "Short profile questions only" },
  short_video: { icon: PlayCircle, label: "Short Video Clips", desc: "Brief sponsored video views" },
};

function Offerwalls() {
  const [config, setConfig] = useState(fallbackConfig);
  const [tab, setTab] = useState("timewall");

  useEffect(() => {
    let mounted = true;

    async function loadOfferwalls() {
      const userId = await getCurrentUserId();
      try {
        const response = await fetch(`/api/offerwalls${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`);
        const data = await response.json();
        if (!mounted || !data?.providers?.length) return;
        setConfig(data);
        setTab(data.providers[0].id);
      } catch {
        /* fallback config keeps the page usable until provider URLs are configured */
      }
    }

    loadOfferwalls();
    return () => {
      mounted = false;
    };
  }, []);

  const activeProvider = config.providers.find((provider) => provider.id === tab) || config.providers[0];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Integrated Offerwalls
        </h1>
        <p className="mt-2 text-muted-foreground">
          Only free app launches, quick polls, and short video clips are enabled.
        </p>
      </header>

      <section className="glass-card p-6">
        <div className="inline-flex flex-wrap rounded-lg border border-white/10 bg-slate-950/50 p-1">
          {config.providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => setTab(provider.id)}
              className={`relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === provider.id
                  ? "text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === provider.id && (
                <motion.span
                  layoutId="tab-active-offerwall"
                  className="absolute inset-0 rounded-md bg-accent glow-emerald"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{provider.name}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {config.allowedCategories.map((category) => {
            const item = categoryLabels[category];
            if (!item) return null;
            return (
              <div key={category} className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-primary/30 to-accent/20 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="mt-3 text-sm font-semibold">{item.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{item.desc}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-slate-950/40">
          {activeProvider?.iframeUrl ? (
            <iframe
              title={`${activeProvider.name} Offerwall`}
              src={activeProvider.iframeUrl}
              className="h-[720px] w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="grid min-h-[360px] place-items-center px-4 py-12 text-center">
              <div>
                <div className="text-sm font-semibold">{activeProvider?.name} SDK/iFrame URL not configured</div>
                <div className="mt-2 max-w-md text-xs text-muted-foreground">
                  Add the provider iframe URL in Vercel environment variables. Backend filtering only allows CPI app launches, micro-quizzes, profiler polls, and short videos.
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
