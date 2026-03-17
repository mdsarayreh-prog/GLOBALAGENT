export const uiTokens = {
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    guidance: "Use 4/8/12/16/24/32 spacing rhythm for layout and component padding.",
  },
  typography: {
    title: "text-base font-semibold tracking-tight",
    subtitle: "text-xs leading-5 text-slate-400",
    body: "text-sm leading-6",
    meta: "text-[11px] leading-5",
  },
  radius: {
    control: "rounded-[14px]",
    card: "rounded-[16px]",
    panel: "rounded-[18px]",
    pill: "rounded-full",
  },
  shadow: {
    subtle:
      "shadow-[0_6px_20px_rgba(2,6,23,0.18)] dark:shadow-[0_8px_24px_rgba(2,6,23,0.38)]",
    medium:
      "shadow-[0_14px_34px_rgba(2,6,23,0.28)] dark:shadow-[0_18px_40px_rgba(2,6,23,0.5)]",
  },
  layout: {
    sidebarExpanded: 304,
    sidebarCollapsed: 94,
    traceExpanded: 284,
    traceCollapsed: 44,
    contentMax: "max-w-5xl",
    chatMax: "max-w-4xl",
  },
  state: {
    success: "text-emerald-300 bg-emerald-500/15 border-emerald-400/30",
    warning: "text-amber-300 bg-amber-500/15 border-amber-400/30",
    danger: "text-rose-300 bg-rose-500/15 border-rose-400/30",
    info: "text-sky-300 bg-sky-500/15 border-sky-400/30",
  },
  motion: {
    duration: {
      fast: 0.12,
      base: 0.18,
      slow: 0.24,
    },
    ease: {
      easeOut: [0.22, 1, 0.36, 1] as [number, number, number, number],
      easeInOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
    },
  },
  icon: {
    sm: 14,
    md: 16,
    lg: 18,
  },
} as const;

