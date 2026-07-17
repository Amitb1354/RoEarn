import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { HelpCircle, Shield, Sparkles } from "lucide-react";
import { RobuxIcon } from "@/components/RobuxIcon";

export const Route = createFileRoute("/withdraw")({
  head: () => ({ meta: [{ title: "Withdraw — RoEarn" }] }),
  component: Withdraw,
});

function Withdraw() {
  const [assetId, setAssetId] = useState("");
  const [amount, setAmount] = useState("50");

  const mockBalance = 120.5;
  const numAmount = Number(amount) || 0;
  const listingPrice = numAmount;
  const valid = numAmount >= 50 && numAmount <= mockBalance && assetId.trim().length > 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Instant Robux Payout Portal
        </h1>
        <p className="mt-2 text-muted-foreground">
          Payouts process in under 60 seconds via Roblox Gamepass purchase.
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
                Roblox Gamepass Asset ID
                <button className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-white/10">
                  <HelpCircle className="h-3 w-3" /> Help
                </button>
              </label>
              <input
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                placeholder="e.g. 12938482937"
                className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 font-mono text-lg tracking-wider text-accent outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30"
              />

              <p className="mt-2 text-xs text-muted-foreground">
                Do not enter your password, only your active Gamepass Asset ID.
              </p>
            </div>

            <div>
              <label className="mb-2 block flex items-center justify-between text-sm font-medium">
                <span>Robux to Cashout (Min 50)</span>
                <span className="text-muted-foreground text-xs">Balance: <span className="text-accent font-bold">{mockBalance.toFixed(2)} R$</span></span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={50}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50"
                  className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 pr-12 text-lg font-semibold outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30"
                />

                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <RobuxIcon size={24} />
                </div>
              </div>
              {numAmount > mockBalance && (
                <p className="mt-2 text-xs text-red-400">
                  You do not have enough Robux in your balance.
                </p>
              )}
            </div>

            <motion.div
              key={listingPrice}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center"
            >
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Set Gamepass Listing Price to
              </div>
              <div className="mt-1 flex items-center justify-center gap-2 text-4xl font-bold text-gradient-indigo">
                {listingPrice}{" "}
                <span className="text-2xl text-muted-foreground font-medium">Robux</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                We will purchase your Gamepass for {listingPrice} Robux. Note that Roblox will apply their standard 30% Creator Tax.
              </div>
            </motion.div>

            <motion.button
              whileHover={{ scale: valid ? 1.01 : 1 }}
              whileTap={{ scale: valid ? 0.99 : 1 }}
              disabled={!valid}
              className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-accent to-emerald-400 px-6 py-4 text-base font-bold tracking-wide text-slate-950 shadow-[0_0_30px] shadow-accent/40 transition-opacity disabled:opacity-40 disabled:shadow-none"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5" />
                REQUEST ROBUX PAYOUT
              </span>
            </motion.button>
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
                style={{ width: "100%" }}
              />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              120,000 / 120,000 R$ remaining for today
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
    </div>
  );
}
