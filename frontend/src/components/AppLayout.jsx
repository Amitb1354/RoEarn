import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  MousePointerClick,
  PlayCircle,
  Wallet,
  Users,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { useEffect, useRef, useState, createContext } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RoEarnLogo } from "./RoEarnLogo";
import { AdSlot } from "./AdSlot";
import { cn } from "@/lib/utils";
import { completeTask } from "@/utils/roearnData";

export const AdEpochContext = createContext(0);

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ptc", label: "PTC Board", icon: MousePointerClick },
  { to: "/watch", label: "Watch to Earn", icon: PlayCircle },
  { to: "/offers", label: "Earn More", icon: MousePointerClick },
  { to: "/withdraw", label: "Withdraw", icon: Wallet },
  { to: "/referrals", label: "Referrals", icon: Users },
];

// Routes that render WITHOUT the app chrome (sidebar + top bar).
const PUBLIC_ROUTES = ["/", "/login", "/register"];
const PASSIVE_AD_DAILY_CAP = 30;
const POPUNDER_DAILY_CAP = 2;
const DAILY_CAP_WINDOW_MS = 24 * 60 * 60 * 1000;

function readWindowedCounter(key) {
  if (typeof window === "undefined") return { count: 0, startedAt: Date.now() };
  const now = Date.now();
  const fallback = { count: 0, startedAt: now };
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null") || fallback;
    if (!parsed.startedAt || now - parsed.startedAt >= DAILY_CAP_WINDOW_MS) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function writeWindowedCounter(key, counter) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(counter));
}

function incrementWindowedCounter(key, max) {
  const counter = readWindowedCounter(key);
  if (counter.count >= max) return { ...counter, capped: true, didIncrement: false };
  const next = {
    ...counter,
    count: counter.count + 1,
    capped: counter.count + 1 >= max,
    didIncrement: true,
  };
  writeWindowedCounter(key, next);
  return next;
}

function incrementSessionCounter(key, max) {
  if (typeof window === "undefined") return { count: 0, capped: false, didIncrement: false };
  const count = Number(sessionStorage.getItem(key) || 0);
  if (count >= max) return { count, capped: true, didIncrement: false };
  const next = count + 1;
  sessionStorage.setItem(key, String(next));
  return { count: next, capped: next >= max, didIncrement: true };
}

function readCookieCounter(key) {
  if (typeof document === "undefined") return { count: 0, startedAt: Date.now() };
  const now = Date.now();
  const fallback = { count: 0, startedAt: now };
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${key}=`))
    ?.split("=")[1];

  if (!cookie) return fallback;

  try {
    const parsed = JSON.parse(decodeURIComponent(cookie));
    if (!parsed.startedAt || now - parsed.startedAt >= DAILY_CAP_WINDOW_MS) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function writeCookieCounter(key, counter) {
  if (typeof document === "undefined") return;
  document.cookie = `${key}=${encodeURIComponent(JSON.stringify(counter))}; max-age=86400; path=/; SameSite=Lax`;
}

function incrementCookieCounter(key, max) {
  const counter = readCookieCounter(key);
  if (counter.count >= max) return { ...counter, capped: true, didIncrement: false };
  const next = {
    ...counter,
    count: counter.count + 1,
    capped: counter.count + 1 >= max,
    didIncrement: true,
  };
  writeCookieCounter(key, next);
  return next;
}

function SidebarContent({ onNavigate }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex h-full flex-col p-5">
      <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 pb-8">
        <div className="relative">
          <RoEarnLogo size={36} />
          <div className="absolute inset-0 -z-10 blur-xl bg-primary/40 rounded-full" />
        </div>
        <span className="text-xl font-bold tracking-tight">
          Ro<span className="text-gradient-indigo">Earn</span>
        </span>
      </Link>
      <nav className="flex flex-col gap-1.5">
        {nav.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg border border-accent/40 bg-accent/5 glow-emerald"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className="relative z-10 h-4 w-4 shrink-0" />
              <span className="relative z-10">{label}</span>
              {active && (
                <span className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px] shadow-accent" />
              )}
            </Link>
          );
        })}
      </nav>
      <Link
        to="/"
        onClick={onNavigate}
        className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </Link>
    </div>
  );
}

export function AppLayout({ children }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [adblockOpen, setAdblockOpen] = useState(false);
  const [interstitial, setInterstitial] = useState(false);
  const [adEpoch, setAdEpoch] = useState(0);
  const prevPath = useRef(pathname);

  const isPublic = PUBLIC_ROUTES.includes(pathname);

  // 45-second ad refresh cycle
  useEffect(() => {
    if (isPublic) return;
    const initialImpression = incrementWindowedCounter("roearn-passive-ad-impressions", PASSIVE_AD_DAILY_CAP);
    if (initialImpression.didIncrement) {
      completeTask("passive_ad", 0.1).catch(() => {});
    }
    const interval = setInterval(() => {
      const impressions = incrementWindowedCounter("roearn-passive-ad-impressions", PASSIVE_AD_DAILY_CAP);
      if (!impressions.didIncrement) return;
      completeTask("passive_ad", 0.1).catch(() => {});
      setAdEpoch((e) => e + 1);
    }, 45000);
    return () => clearInterval(interval);
  }, [isPublic]);

  // Anti-adblock mock: show once per session after 1.2s on the app.
  useEffect(() => {
    if (isPublic) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("roearn-adblock-ack")) return;
    const t = setTimeout(() => setAdblockOpen(true), 1200);
    return () => clearTimeout(t);
  }, [isPublic]);

  // Interstitial: trigger a 1s overlay when the pathname changes inside the app.
  useEffect(() => {
    if (isPublic) return;
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    const sessionPopunders = incrementSessionCounter("roearn-session-popunder-triggers", POPUNDER_DAILY_CAP);
    if (!sessionPopunders.didIncrement) return;
    const cookiePopunders = incrementCookieCounter("roearn_popunder_triggers", POPUNDER_DAILY_CAP);
    if (!cookiePopunders.didIncrement) return;
    setInterstitial(true);
    const t = setTimeout(() => setInterstitial(false), 1000);
    return () => clearTimeout(t);
  }, [pathname, isPublic]);

  if (isPublic) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <AdEpochContext.Provider value={adEpoch}>
            {children}
          </AdEpochContext.Provider>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 md:left-[170px] z-30 hidden w-64 border-r border-border/60 bg-slate-950/60 backdrop-blur-xl lg:block">
        <SidebarContent />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-slate-950/70 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <RoEarnLogo size={28} />
          <span className="font-bold">
            Ro<span className="text-gradient-indigo">Earn</span>
          </span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="rounded-md p-2 hover:bg-white/5"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />

            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border/60 bg-slate-950/95 backdrop-blur-xl lg:hidden"
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 rounded-md p-2 hover:bg-white/5"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Left Skyscraper Ad — desktop only, outside main content area */}
      <AdSlot
        label="160×600 Skyscraper"
        epoch={adEpoch}
        className="fixed left-2 top-1/2 z-20 hidden h-[600px] w-[160px] -translate-y-1/2 md:flex"
      />

      {/* Right Skyscraper Ad — desktop only, outside main content area */}
      <AdSlot
        label="160×600 Skyscraper"
        epoch={adEpoch}
        className="fixed right-2 top-1/2 z-20 hidden h-[600px] w-[160px] -translate-y-1/2 md:flex"
      />

      <main className="md:px-[170px] lg:pl-[426px] lg:pr-[170px]">
        {/* Top Banner Ad */}
        <div className="px-4 pt-3 sm:px-6 lg:px-10">
          <AdSlot label="728×90 Leaderboard Banner" epoch={adEpoch} className="h-[70px] w-full" />
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <AdEpochContext.Provider value={adEpoch}>
                {children}
              </AdEpochContext.Provider>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile square ad directly above bottom banner */}
        <div className="md:hidden flex justify-center mb-4">
          <AdSlot label="300×250 Mobile Banner" epoch={adEpoch} className="h-[250px] w-[300px]" />
        </div>

        {/* Bottom spacer so content isn't hidden behind fixed bottom banner */}
        <div className="h-[80px]" />
      </main>

      {/* Bottom Banner Ad — fixed to viewport bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-20 md:px-[170px] lg:pl-[426px] lg:pr-[170px]">
        <div className="px-4 pb-2 sm:px-6 lg:px-10">
          <AdSlot label="970×90 Bottom Banner" epoch={adEpoch} className="h-[70px] w-full" />
        </div>
      </div>

      {/* Interstitial ad overlay */}
      <AnimatePresence>
        {interstitial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/95 backdrop-blur-md"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
                Simulating Interstitial Ad…
              </div>
              <div className="text-xs text-muted-foreground/60">
                Sponsored placement · continues in 1s
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Anti-adblock warning */}
      <AnimatePresence>
        {adblockOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="glass-card w-full max-w-md p-6"
            >
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-yellow-500/15 text-yellow-300 shadow-[0_0_18px] shadow-yellow-500/30">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">Hey grinder!</h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Please disable your adblocker to ensure your tasks and Robux credit track
                    properly. RoEarn stays free because sponsored placements pay out your grind.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => {
                    sessionStorage.setItem("roearn-adblock-ack", "1");
                    setAdblockOpen(false);
                  }}
                  className="rounded-lg bg-gradient-to-r from-accent to-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-[0_0_20px] shadow-accent/40"
                >
                  Got it, continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
