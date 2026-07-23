import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { RoEarnLogo } from "@/components/RoEarnLogo";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/utils/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — RoEarn" },
      { name: "description", content: "Log in to your RoEarn dashboard and claim today's Robux." },
    ],
  }),
  component: LoginPage,
});

function AuthShell({ children, title, subtitle }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/3 h-[420px] w-[420px] rounded-full bg-primary/30 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-accent/25 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card relative z-10 w-full max-w-md p-8"
      >
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <RoEarnLogo size={40} />
          <span className="text-2xl font-bold tracking-tight">
            Ro<span className="text-gradient-indigo">Earn</span>
          </span>
        </Link>
        <h1 className="text-center text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-center text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </motion.div>
    </div>
  );
}

export function FieldInput({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        {...props}
        className="w-full rounded-xl border border-border/60 bg-slate-950/60 py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
      />
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      setError("Authentication service (Supabase) is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const userId = data.user?.id;
      const existing = localStorage.getItem("device_account_bound");
      if (userId) {
        if (existing && existing !== userId) {
          await supabase.auth.signOut();
          setError("Security Restriction: This device is already linked to another account.");
        } else {
          localStorage.setItem("device_account_bound", userId);
          navigate({ to: "/dashboard" });
        }
      }
    } catch (e) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back, grinder." subtitle="Log in to keep your streak alive.">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}
        {!isSupabaseConfigured && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-400">
            ⚠️ Supabase environment variables missing on Vercel. Set VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY.
          </div>
        )}
        <FieldInput
          icon={Mail}
          type="email"
          name="email"
          placeholder="example@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <FieldInput
          icon={Lock}
          type="password"
          name="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-border bg-transparent accent-accent"
            />
            Remember me
          </label>
          <a href="#" className="text-accent hover:underline">
            Forgot password?
          </a>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground shadow-[0_0_30px_-8px] shadow-accent/60 transition hover:brightness-110 disabled:opacity-70"
        >
          {loading ? (
            "Logging in…"
          ) : (
            <>
              Log in <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border/60" /> OR <div className="h-px flex-1 bg-border/60" />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        New to RoEarn?{" "}
        <Link to="/register" className="font-semibold text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
