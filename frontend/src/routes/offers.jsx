import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { Gamepad2, Download, Star, ShoppingBag } from "lucide-react";
import { RobuxIcon } from "@/components/RobuxIcon";

export const Route = createFileRoute("/offers")({
  head: () => ({ meta: [{ title: "Offerwalls — RoEarn" }] }),
  component: Offerwalls,
});

const offers = {
  Lootably: [
    {
      icon: Gamepad2,
      title: "Download & Play Rise of Kingdoms",
      desc: "Reach City Hall 8",
      reward: 480,
    },
    { icon: Star, title: "Complete Survey (5 min)", desc: "Verified profile required", reward: 24 },
    { icon: ShoppingBag, title: "Sign up for Temu", desc: "Place first order", reward: 320 },
    { icon: Download, title: "Install Cash App", desc: "Verify identity", reward: 180 },
  ],
  Monlix: [
    { icon: Gamepad2, title: "Play Mafia City Level 15", desc: "New users only", reward: 620 },
    { icon: Star, title: "Nielsen Panel Signup", desc: "Keep app installed 30 days", reward: 900 },
    { icon: ShoppingBag, title: "SHEIN First Purchase", desc: "Min $10", reward: 260 },
  ],
};

function Offerwalls() {
  const [tab, setTab] = useState("Lootably");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Integrated Offerwalls
        </h1>
        <p className="mt-2 text-muted-foreground">
          High-paying tasks aggregated from top networks.
        </p>
      </header>

      <section className="glass-card p-6">
        <div className="inline-flex rounded-lg border border-white/10 bg-slate-950/50 p-1">
          {Object.keys(offers).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === k
                  ? "text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === k && (
                <motion.span
                  layoutId="tab-active-offerwall"
                  className="absolute inset-0 rounded-md bg-accent glow-emerald"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{k}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-2">
          {offers[tab].map((o, i) => (
            <motion.div
              key={o.title}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group flex items-center gap-4 rounded-xl border border-white/5 bg-slate-950/40 p-4 transition-colors hover:border-primary/40 hover:bg-slate-900/60"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary/30 to-accent/20 text-primary">
                <o.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{o.title}</div>
                <div className="truncate text-xs text-muted-foreground">{o.desc}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5 text-sm font-bold text-accent shadow-[0_0_12px] shadow-accent/20">
                <RobuxIcon size={16} />
                {o.reward}
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
