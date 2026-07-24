import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Copy, Check, Users, TrendingUp, Wallet, Gift, Sparkles } from "lucide-react";
import { RobuxIcon } from "@/components/RobuxIcon";
import { fetchReferralStats, getCurrentUserId } from "@/utils/roearnData";

export const Route = createFileRoute("/referrals")({
  head: () => ({
    meta: [
      { title: "Referrals - RoEarn" },
      { name: "description", content: "Invite friends and earn 10% lifetime commission on their task earnings." },
    ],
  }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({
    referralCode: "",
    referredUsers: 0,
    passivePointsEarned: 0,
  });

  useEffect(() => {
    let mounted = true;

    async function loadReferralStats() {
      const userId = await getCurrentUserId();
      if (!userId) return;
      const nextStats = await fetchReferralStats(userId);
      if (mounted) setStats(nextStats);
    }

    loadReferralStats();
    return () => {
      mounted = false;
    };
  }, []);

  const referralLink = `https://ro-earn.vercel.app/register?ref=${stats.referralCode}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      /* clipboard may not be available */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Referral Program
        </h1>
        <p className="mt-2 text-muted-foreground">
          Invite friends and earn <span className="font-semibold text-accent">10% lifetime commission</span> on
          everything they earn from tasks. The bonus comes from us - your friends keep 100% of their earnings.
        </p>
      </header>

      <motion.div
        whileHover={{ y: -2 }}
        className="glass-card relative overflow-hidden p-6 sm:p-8"
      >
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Gift className="h-4 w-4 text-accent" />
            Your Referral Link
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 overflow-hidden rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3">
              <div className="truncate font-mono text-sm text-accent">
                {stats.referralCode ? referralLink : "Sign in to generate your referral link"}
              </div>
            </div>
            <motion.button
              whileHover={{ scale: stats.referralCode ? 1.04 : 1 }}
              whileTap={{ scale: stats.referralCode ? 0.96 : 1 }}
              onClick={copyLink}
              disabled={!stats.referralCode}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all ${
                copied
                  ? "bg-accent/20 text-accent"
                  : "bg-gradient-to-r from-accent to-emerald-400 text-slate-950 shadow-[0_0_24px] shadow-accent/40"
              } disabled:opacity-40`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy Link
                </>
              )}
            </motion.button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Share this link anywhere - Discord, YouTube, socials. When someone signs up and grinds, you earn 10% of
            their base task rewards automatically.
          </p>
        </div>
      </motion.div>

      <div className="grid gap-5 sm:grid-cols-3">
        <motion.div whileHover={{ y: -3 }} className="glass-card relative overflow-hidden p-6 glow-indigo">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Total Referred Friends
            </div>
            <div className="mt-3 text-3xl font-bold tracking-tight">
              {stats.referredUsers}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {stats.referredUsers} friends active
            </div>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -3 }} className="glass-card relative overflow-hidden p-6">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              Total Referral R$ Generated
            </div>
            <div className="mt-3 flex items-center gap-2 text-3xl font-bold tracking-tight">
              <RobuxIcon size={24} />
              {stats.passivePointsEarned.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-accent">
              Lifetime commission earned
            </div>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -3 }} className="glass-card relative overflow-hidden p-6 glow-emerald">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" />
              Auto-Credited Balance
            </div>
            <div className="mt-3 flex items-center gap-2 text-3xl font-bold tracking-tight text-accent">
              <RobuxIcon size={24} />
              {stats.passivePointsEarned.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Paid instantly into your points balance
            </div>
          </div>
        </motion.div>
      </div>

      <motion.button
        whileHover={{ scale: 1 }}
        whileTap={{ scale: 1 }}
        disabled
        className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-accent to-emerald-400 px-6 py-4 text-base font-bold tracking-wide text-slate-950 shadow-[0_0_30px] shadow-accent/40 transition-opacity disabled:opacity-40 disabled:shadow-none"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5" />
          REFERRAL EARNINGS AUTO-CREDITED
        </span>
      </motion.button>

      <motion.div whileHover={{ y: -2 }} className="glass-card p-6 sm:p-8">
        <h2 className="text-lg font-semibold">How the Referral Program Works</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Share Your Link",
              desc: "Send your unique referral link to friends via Discord, social media, or anywhere.",
            },
            {
              step: "2",
              title: "Friends Sign Up & Grind",
              desc: "When they register through your link and complete PTC ads, shortlinks, videos, or offerwalls, you earn.",
            },
            {
              step: "3",
              title: "Earn 10% Commission",
              desc: "You get 10% of their base task earnings for life. They keep 100% - the bonus is on us.",
            },
          ].map((s) => (
            <div key={s.step} className="relative rounded-xl border border-white/5 bg-slate-950/40 p-5">
              <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-accent/20 text-sm font-bold text-accent">
                {s.step}
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
