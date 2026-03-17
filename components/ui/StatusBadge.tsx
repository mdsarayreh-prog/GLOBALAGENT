import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  label: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  className?: string;
}

export function StatusBadge({ label, tone = "neutral", className }: StatusBadgeProps) {
  const toneClass =
    tone === "info"
      ? "border-sky-300/70 bg-sky-100/80 text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-300"
      : tone === "success"
        ? "border-emerald-300/70 bg-emerald-100/80 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-300"
        : tone === "warning"
          ? "border-amber-300/70 bg-amber-100/80 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-300"
          : tone === "danger"
            ? "border-rose-300/70 bg-rose-100/80 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-300"
            : "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600/70 dark:bg-slate-800/80 dark:text-slate-200";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
        toneClass,
        className
      )}
    >
      {label}
    </span>
  );
}

