import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { RoEarnLogo } from "@/components/RoEarnLogo";
import { RobuxIcon, RobuxPrice } from "@/components/RobuxIcon";
import {
  MousePointerClick,
  PlayCircle,
  Wallet,
  ShieldCheck,
  Zap,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Star,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RoEarn — Earn Free Robux Daily" },
      {
        name: "description",
        content:
          "The premium rewards dashboard for Roblox. Complete PTC ads, watch videos and cash out through fixed Gift Card tiers. Trusted by 120k+ players.",
      },
      { property: "og:title", content: "RoEarn — Earn Free Robux Daily" },
      {
        property: "og:description",
        content: "PTC ads, videos, offerwalls and fixed Gift Card payouts.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: MousePointerClick,
    title: "PTC Ad Board",
    body: "40 high-payout paid-to-click slots refreshed every 24h. Earn while you scroll.",
    tint: "from-indigo-500/20 to-transparent",
  },
  {
    icon: PlayCircle,
    title: "Watch to Earn",
    body: "Premium videos and offerwall integrations. Bigger payouts for longer sessions.",
    tint: "from-emerald-500/20 to-transparent",
  },
  {
    icon: Wallet,
    title: "Gift Card Payouts",
    body: "Cash out at fixed Robux Gift Card tiers once your points reach the minimum threshold.",
    tint: "from-fuchsia-500/20 to-transparent",
  },
  {
    icon: ShieldCheck,
    title: "Daily Pool Protection",
    body: "A protected daily payout pool ensures every request is fulfilled — no rug pulls.",
    tint: "from-cyan-500/20 to-transparent",
  },
];

const tiers = [
  { label: "Starter", amount: 400, sub: "$5.00 Gift Card" },
  { label: "Grinder", amount: 800, sub: "$10.00 Gift Card", popular: true },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/30 blur-[140px]" />
        <div className="absolute top-1/3 -right-20 h-[380px] w-[380px] rounded-full bg-accent/25 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_60%,#0B0F19_100%)]" />
      </div>

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2.5">
          <RoEarnLogo size={36} />
          <span className="text-xl font-bold tracking-tight">
            Ro<span className="text-gradient-indigo">Earn</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#payouts" className="hover:text-foreground">
            Payouts
          </a>
          <a href="#proof" className="hover:text-foreground">
            Community
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-[0_0_20px_-4px] shadow-accent/60 transition hover:brightness-110"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-10 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
        >
          <Sparkles className="h-3.5 w-3.5" /> New — Daily Pool Protection is live
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mx-auto mt-6 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
        >
          The premium way to earn <span className="text-gradient-indigo">real Robux</span>
          <br className="hidden sm:block" /> without spending a cent.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
        >
          Click, watch, complete — and cash out. RoEarn turns your downtime into Gift Card-ready
          Robux with fixed tiers and airtight protection.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            to="/register"
            className="group inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-accent-foreground shadow-[0_0_40px_-8px] shadow-accent/70 transition hover:brightness-110"
          >
            Start earning free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-white/5 px-6 py-3.5 text-base font-semibold backdrop-blur-md hover:bg-white/10"
          >
            I already have an account
          </Link>
        </motion.div>

        {/* Stat row */}
        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { k: "120k+", v: "Grinders" },
            { k: "R$ 4.2M", v: "Paid out" },
            { k: "< 60s", v: "Payout speed" },
            { k: "99.98%", v: "Uptime" },
          ].map((s) => (
            <div key={s.v} className="glass-card px-4 py-4">
              <div className="text-2xl font-bold tracking-tight">{s.k}</div>
              <div className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">
                {s.v}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Four ways to stack <RobuxIcon size={28} className="inline-block align-[-4px]" />
          </h2>
          <p className="mt-3 text-muted-foreground">Pick your grind. Every path pays.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -4 }}
              className="glass-card relative overflow-hidden p-6"
            >
              <div
                className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br blur-2xl ${f.tint}`}
              />
              <div className="relative">
                <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-2.5">
                  <f.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Payouts */}
      <section id="payouts" className="relative z-10 mx-auto max-w-7xl px-6 pb-20">
        <div className="glass-card relative overflow-hidden p-8 sm:p-12">
          <div className="absolute -left-20 top-0 h-full w-1/2 bg-gradient-to-r from-primary/20 to-transparent blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Zap className="h-3.5 w-3.5" /> Gift Card Payouts
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Cash out from as little as{" "}
                <RobuxPrice amount={400} size={26} className="text-accent" />
              </h2>
              <p className="mt-4 max-w-md text-muted-foreground">
                Redeem fixed Robux Gift Card tiers when your account reaches 400 points.
              </p>
              <Link
                to="/register"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-[0_0_30px_-8px] shadow-accent/70"
              >
                Claim your first payout <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {tiers.map((t) => (
                <motion.div
                  key={t.label}
                  whileHover={{ y: -4 }}
                  className={`relative rounded-2xl border p-5 text-center ${
                    t.popular
                      ? "border-accent/50 bg-accent/5 glow-emerald"
                      : "border-border/60 bg-slate-900/40"
                  }`}
                >
                  {t.popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                      Popular
                    </span>
                  )}
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t.label}
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <RobuxIcon size={28} />
                    <span className="text-3xl font-bold tabular-nums">{t.amount}</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">{t.sub}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Proof */}
      <section id="proof" className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by grinders worldwide
          </h2>
          <div className="mt-3 flex items-center justify-center gap-1 text-accent">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-accent" />
            ))}
            <span className="ml-2 text-sm text-muted-foreground">4.9 / 5 · 8,214 reviews</span>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              name: "BloxCrusher99",
              q: "Got my first 400 R$ payout in under a minute. This is unreal.",
            },
            {
              name: "SkyRider_RBX",
              q: "The daily pool thing actually works — never had a failed withdraw.",
            },
            {
              name: "NightOwlGamer",
              q: "I keep RoEarn open on my second monitor. Passive Robux, no cap.",
            },
          ].map((t) => (
            <div key={t.name} className="glass-card p-6">
              <p className="text-sm text-muted-foreground">"{t.q}"</p>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span className="font-semibold">{t.name}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24 text-center">
        <div className="glass-card p-10 glow-indigo">
          <h3 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your Gift Card is one click away.
          </h3>
          <p className="mt-3 text-muted-foreground">
            Free forever. No credit card. Cash out from{" "}
            <RobuxPrice amount={400} size={18} className="text-accent" />.
          </p>
          <Link
            to="/register"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-accent-foreground shadow-[0_0_40px_-8px] shadow-accent/80"
          >
            Create free account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Roearn is an independent rewards platform and is not affiliated with, sponsored by, or endorsed by Roblox Corporation. Roblox and Robux are registered trademarks of Roblox Corporation.
      </footer>
    </div>
  );
}
