import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { HelpCircle, Shield, Sparkles } from "lucide-react";
import { RobuxIcon } from "@/components/RobuxIcon";
import { isSupabaseConfigured, supabase } from "@/utils/auth";
import { fetchWithdrawalHistory } from "@/utils/roearnData";

export const Route = createFileRoute("/withdraw")({
  head: () => ({ meta: [{ title: "Withdraw — RoEarn" }] }),
  component: Withdraw,
});

function Withdraw() {
  const giftCardTiers = [
    { robux: 400, cashValue: "$5.00", points: 400 },
    { robux: 800, cashValue: "$10.00", points: 800 },
  ];
  const [tierPoints, setTierPoints] = useState("400");
  const [currentUserPoints, setCurrentUserPoints] = useState(0);
  const [userId, setUserId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function loadBalance() {
      if (!isSupabaseConfigured) return;
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData?.user?.id;
      if (!authUserId) return;
      if (mounted) setUserId(authUserId);

      const { data } = await supabase
        .from("profiles")
        .select("robux_balance")
        .eq("id", authUserId)
        .single();

      if (mounted && data) {
        setCurrentUserPoints(Number(data.robux_balance || 0));
      }

      if (mounted) {
        setWithdrawals(await fetchWithdrawalHistory(authUserId));
      }
    }

    loadBalance();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedTier = giftCardTiers.find((tier) => tier.points === Number(tierPoints)) || giftCardTiers[0];
  const cashoutProgress = Math.min((currentUserPoints / 400) * 100, 100);
  const valid = currentUserPoints >= 400 && currentUserPoints >= selectedTier.points && Boolean(userId);

  const requestGiftCardPayout = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setNotice(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const response = await fetch("/api/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ userId, tierPoints: selectedTier.points }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Gift Card redemption failed.");
      setCurrentUserPoints((points) => points - selectedTier.points);
      setWithdrawals(await fetchWithdrawalHistory(userId));
      setNotice("Gift Card payout request submitted.");
    } catch (error) {
      setNotice(error.message || "Gift Card redemption failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Instant Robux Payout Portal
        </h1>
        <p className="mt-2 text-muted-foreground">
          Payouts process as fixed Roblox Gift Card redemptions.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Form */}
        <motion.div
          whileHover={{ y: -2 }}
          className="glass-card relative overflow-hidden p-6 sm:p-8"
        >
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/15 blur-3xl" />

          <div className="space-y-6">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                Gift Card Redemption Tier
                <button className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-white/10">
                  <HelpCircle className="h-3 w-3" /> Help
                </button>
              </label>
              <select
                value={tierPoints}
                onChange={(e) => setTierPoints(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 font-mono text-lg tracking-wider text-accent outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30"
              >
                {giftCardTiers.map((tier) => (
                  <option key={tier.points} value={tier.points}>
                    {tier.robux.toLocaleString()} Robux Gift Card - {tier.cashValue} / {tier.points} Points
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-muted-foreground">
                Gift Card redemptions unlock once your account reaches 400 points.
              </p>
            </div>

            <div>
              <label className="mb-2 block flex items-center justify-between text-sm font-medium">
                <span>Points to Cashout (Min 400)</span>
                <span className="text-muted-foreground text-xs">Balance: <span className="text-accent font-bold">{currentUserPoints.toFixed(2)} Points</span></span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={400}
                  value={selectedTier.points}
                  readOnly
                  placeholder="400"
                  className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 pr-12 text-lg font-semibold outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30"
                />

                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <RobuxIcon size={24} />
                </div>
              </div>
              {!valid && (
                <p className="mt-2 text-xs text-red-400">
                  You need at least 400 points before claiming a Gift Card.
                </p>
              )}
            </div>

            <motion.div
              key={selectedTier.points}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center"
            >
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Selected Gift Card Tier
              </div>
              <div className="mt-1 flex items-center justify-center gap-2 text-4xl font-bold text-gradient-indigo">
                {selectedTier.robux.toLocaleString()}{" "}
                <span className="text-2xl text-muted-foreground font-medium">Robux</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Costs {selectedTier.points.toLocaleString()} points for a {selectedTier.cashValue} value.
              </div>
            </motion.div>

            <motion.button
              whileHover={{ scale: valid ? 1.01 : 1 }}
              whileTap={{ scale: valid ? 0.99 : 1 }}
              disabled={!valid}
              onClick={requestGiftCardPayout}
              className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-accent to-emerald-400 px-6 py-4 text-base font-bold tracking-wide text-slate-950 shadow-[0_0_30px] shadow-accent/40 transition-opacity disabled:opacity-40 disabled:shadow-none"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5" />
                {submitting ? "REQUESTING GIFT CARD PAYOUT" : "REQUEST GIFT CARD PAYOUT"}
              </span>
            </motion.button>
            {notice && <p className="text-center text-xs text-muted-foreground">{notice}</p>}
          </div>
        </motion.div>

        {/* Side widgets */}
        <div className="space-y-4">
          <motion.div whileHover={{ y: -2 }} className="glass-card p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Shield className="h-3.5 w-3.5" /> Daily Pool Protection
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_10px] shadow-accent" />
              <span className="text-2xl font-bold text-accent">GREEN</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-300"
                style={{ width: `${cashoutProgress}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {Math.min(currentUserPoints, 400).toFixed(2)} / 400 Points toward first Gift Card
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} className="glass-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Avg. Payout Time
            </div>
            <div className="mt-1 text-2xl font-bold">47s</div>
            <div className="mt-1 text-xs text-accent">↑ 12% faster than last week</div>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} className="glass-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Lifetime Withdrawn
            </div>
            <div className="mt-1 flex items-center gap-2 text-2xl font-bold">
              <RobuxIcon size={22} /> 4,821
            </div>
          </motion.div>
        </div>
      </div>

      <section className="glass-card p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Withdrawal History
        </div>
        <div className="mt-4 space-y-2">
          {withdrawals.length === 0 ? (
            <div className="rounded-lg border border-white/5 bg-slate-950/40 p-3 text-xs text-muted-foreground">
              No Gift Card redemptions yet.
            </div>
          ) : (
            withdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="rounded-lg border border-white/5 bg-slate-950/40 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-semibold">
                    {withdrawal.gift_card_robux?.toLocaleString()} Robux Digital Gift Card
                  </span>
                  <span className="text-xs uppercase tracking-wider text-accent">
                    {withdrawal.status}
                  </span>
                </div>
                {withdrawal.ecard_pin && (
                  <div className="mt-2 rounded-md border border-accent/20 bg-accent/10 px-3 py-2 font-mono text-xs text-accent">
                    {withdrawal.ecard_pin}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
