import { cn } from "@/lib/utils";

export function RobuxIcon({ size = 32, className }) {
  return (
    <img
      src="/RoEarnCash.svg"
      width={size}
      height={size}
      alt="Robux"
      className={cn("inline-block select-none", className)}
      style={{
        filter: "drop-shadow(0 2px 8px rgba(201, 168, 76, 0.35))",
      }}
      draggable={false}
    />
  );
}

/** Inline price format: `<RobuxPrice amount={100} />` */
export function RobuxPrice({ amount, size = 18, className }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-semibold tabular-nums", className)}>
      <RobuxIcon size={size} />
      {typeof amount === "number" ? amount.toLocaleString() : amount}
    </span>
  );
}
