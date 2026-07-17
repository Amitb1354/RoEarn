import { cn } from "@/lib/utils";
import { useId } from "react";

/**
 * RoEarn brand mark — golden Robux hexagon coin icon.
 */
export function RoEarnLogo({ size = 40, className, withText = false }) {
  const gradientId = "logo-gold-" + useId().replace(/:/g, "");
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 70 70"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="RoEarn"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="50%" stopColor="#F5B014" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
        </defs>
        {/* Outer thick gold stroke */}
        <polygon
          points="35,6 60,20.5 60,49.5 35,64 10,49.5 10,20.5"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="4"
        />
        {/* Inner thin gold stroke */}
        <polygon
          points="35,14 53,24.5 53,45.5 35,56 17,45.5 17,24.5"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.5"
          opacity="0.6"
        />
        {/* Center solid gold hexagon */}
        <polygon
          points="35,26 45,31.8 45,43.2 35,49 25,43.2 25,31.8"
          fill={`url(#${gradientId})`}
        />
      </svg>
      {withText && (
        <span className="text-xl font-bold tracking-tight">
          Ro<span className="text-gradient-indigo">Earn</span>
        </span>
      )}
    </span>
  );
}
