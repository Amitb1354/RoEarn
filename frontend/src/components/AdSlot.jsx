import { motion } from "motion/react";

export function AdSlot({ label, className = "", epoch }) {
  return (
    <motion.div
      key={epoch}
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`grid place-items-center rounded-lg border border-dashed border-white/10 bg-slate-950/40 text-[10px] uppercase tracking-widest text-muted-foreground/60 ${className}`}
    >
      {label}
    </motion.div>
  );
}
