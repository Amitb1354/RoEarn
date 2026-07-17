import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { RoEarnLogo } from "@/components/RoEarnLogo";
import { ArrowRight, Lock, Mail, User, Users } from "lucide-react";
import { FieldInput } from "./login";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — RoEarn" },
      { name: "description", content: "Join RoEarn and start earning free Robux today." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [referrer, setReferrer] = useState(null);

  // Read ?ref= param and store in sessionStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      sessionStorage.setItem("roearn-referrer", ref);
      setReferrer(ref);
    } else {
      const stored = sessionStorage.getItem("roearn-referrer");
      if (stored) setReferrer(stored);
    }
  }, []);

  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => navigate({ to: "/dashboard" }), 800);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-1/3 h-[420px] w-[420px] rounded-full bg-accent/30 blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-[360px] w-[360px] rounded-full bg-primary/25 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card relative z-10 w-full max-w-md p-8"
      >
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <RoEarnLogo size={40} />
          <span className="text-2xl font-bold tracking-tight">
            Ro<span className="text-gradient-indigo">Earn</span>
          </span>
        </Link>

        {referrer && (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Users className="h-3.5 w-3.5" />
            Referred by {referrer}
          </div>
        )}

        <h1 className="text-center text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-1.5 text-center text-sm text-muted-foreground">
          Free forever. No credit card required.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <FieldInput icon={User} type="text" placeholder="Roblox username" required />
          <FieldInput icon={Mail} type="email" placeholder="Email address" required />
          <FieldInput
            icon={Lock}
            type="password"
            placeholder="Choose a password"
            required
            minLength={6}
          />

          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              required
              className="mt-0.5 h-3.5 w-3.5 rounded border-border bg-transparent accent-accent"
            />
            <span>
              I agree to the{" "}
              <a href="#" className="text-accent hover:underline">
                Terms
              </a>{" "}
              and{" "}
              <a href="#" className="text-accent hover:underline">
                Privacy Policy
              </a>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground shadow-[0_0_30px_-8px] shadow-accent/60 transition hover:brightness-110 disabled:opacity-70"
          >
            {loading ? (
              "Creating account…"
            ) : (
              <>
                Create free account <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already grinding?{" "}
          <Link to="/login" className="font-semibold text-accent hover:underline">
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
