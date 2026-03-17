"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ChevronRight, Clock3, Route, ShieldCheck, Wrench } from "lucide-react";
import { ReactNode } from "react";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { uiTokens } from "@/lib/ui-tokens";
import { cn } from "@/lib/utils";
import { RouteDecision } from "@/types/chat";

interface TracePanelProps {
  trace: RouteDecision | null;
  isOpen: boolean;
  onToggle: () => void;
  compact?: boolean;
}

export function TracePanel({ trace, isOpen, onToggle, compact = false }: TracePanelProps) {
  const confidencePercent = trace ? `${Math.round(trace.confidence * 100)}%` : "-";

  return (
    <aside
      className={cn(
        "h-full border-l border-slate-200/80 bg-white/88 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/88",
        compact && "rounded-[16px] border border-slate-200 dark:border-slate-800"
      )}
      aria-label="Routing trace panel"
    >
      <div className="flex items-center justify-between border-b border-slate-200/80 px-3 py-2.5 dark:border-slate-800/80">
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-400">Trace</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-500">Governance + routing observability</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-[10px] p-1 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="Toggle trace panel"
        >
          <ChevronRight size={uiTokens.icon.md} className={cn("transition-transform", isOpen && "rotate-180")} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: uiTokens.motion.duration.base, ease: uiTokens.motion.ease.easeOut }}
            className="space-y-3 p-3"
          >
            {trace ? (
              <>
                <TraceRow label="Selected agent" value={trace.selectedAgentId} icon={<Route size={14} />} />
                <TraceRow label="Resolved agent" value={trace.resolvedAgentId} icon={<ShieldCheck size={14} />} />
                <TraceRow label="Confidence" value={confidencePercent} icon={<AlertTriangle size={14} />} />
                <TraceRow label="Latency" value={`${trace.latencyMs} ms`} icon={<Clock3 size={14} />} />

                <div className="rounded-[14px] border border-slate-300 bg-white/80 p-2.5 text-xs leading-5 text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                  <p className="mb-1 font-semibold text-slate-900 dark:text-slate-200">Routing decision</p>
                  <p>{trace.reason}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <StatusBadge
                      label={
                        trace.decisionType === "delegated"
                          ? "Delegated"
                          : trace.decisionType === "direct"
                            ? "Direct answer"
                            : trace.decisionType === "mention"
                              ? "Mention-directed"
                              : "Manual"
                      }
                      tone={trace.decisionType === "delegated" ? "info" : "neutral"}
                    />
                    <StatusBadge
                      label={trace.fallbackState === "none" ? "No fallback" : trace.fallbackState.replace("_", " ")}
                      tone={trace.fallbackState === "none" ? "success" : "warning"}
                    />
                  </div>
                </div>

                <TraceList label="Context signals" values={trace.contextSignals} />
                <TraceList label="Approved sources" values={trace.sourcesUsed} />

                <div className="rounded-[14px] border border-slate-300 bg-white/80 p-2.5 dark:border-slate-800 dark:bg-slate-900/70">
                  <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-500">
                    <Wrench size={12} />
                    Tools called
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {trace.toolsCalled.map((tool) => (
                      <StatusBadge key={tool} label={tool} tone="neutral" />
                    ))}
                  </div>
                </div>

                {trace.error && (
                  <div className="rounded-[14px] border border-rose-300/60 bg-rose-100/70 p-2.5 text-xs text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-200">
                    <p className="mb-1 font-semibold">Fallback / error state</p>
                    <p>{trace.error}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-[14px] border border-dashed border-slate-300 p-3 text-xs leading-5 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No trace yet. Send a request to inspect routing confidence, sources, tools, and fallback behavior.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

interface TraceRowProps {
  label: string;
  value: string;
  icon: ReactNode;
}

function TraceRow({ label, value, icon }: TraceRowProps) {
  return (
    <div className="rounded-[14px] border border-slate-300 bg-white/80 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/70">
      <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-500">
        {icon}
        {label}
      </p>
      <p className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

interface TraceListProps {
  label: string;
  values: string[];
}

function TraceList({ label, values }: TraceListProps) {
  return (
    <div className="rounded-[14px] border border-slate-300 bg-white/80 p-2.5 dark:border-slate-800 dark:bg-slate-900/70">
      <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-500">{label}</p>
      {values.length > 0 ? (
        <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
          {values.map((value) => (
            <li key={value} className="truncate">
              • {value}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-500">None captured.</p>
      )}
    </div>
  );
}

