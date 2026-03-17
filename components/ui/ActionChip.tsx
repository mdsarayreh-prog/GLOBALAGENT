import { motion } from "framer-motion";
import { ReactNode } from "react";

import { uiTokens } from "@/lib/ui-tokens";
import { cn } from "@/lib/utils";

interface ActionChipProps {
  label: string;
  onClick: () => void;
  active?: boolean;
  icon?: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function ActionChip({ label, onClick, active = false, icon, className, ariaLabel }: ActionChipProps) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: uiTokens.motion.duration.fast, ease: uiTokens.motion.ease.easeOut }}
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
        active
          ? "border-sky-300/70 bg-sky-100 text-sky-700 dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-200"
          : "border-slate-300 bg-white/85 text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-slate-600/70 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white",
        className
      )}
    >
      {icon}
      {label}
    </motion.button>
  );
}


