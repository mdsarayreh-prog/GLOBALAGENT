"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, LogOut, Menu, MoonStar, SunMedium, Workflow } from "lucide-react";

import { AgentPicker } from "@/components/AgentPicker";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getAgentById } from "@/lib/agents";
import { uiTokens } from "@/lib/ui-tokens";
import { cn } from "@/lib/utils";
import { Agent, AgentId } from "@/types/chat";

interface TopBarProps {
  agents: Agent[];
  selectedAgentId: AgentId;
  recentAgentIds: AgentId[];
  autoRoute: boolean;
  traceOpen: boolean;
  workspaceMode: "user" | "admin";
  canViewTrace: boolean;
  showAgentPicker: boolean;
  canToggleAutoRoute: boolean;
  theme: "light" | "dark";
  onSelectAgent: (agentId: AgentId) => void;
  onToggleAutoRoute: () => void;
  onToggleTrace: () => void;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
}

export function TopBar({
  agents,
  selectedAgentId,
  recentAgentIds,
  autoRoute,
  traceOpen,
  workspaceMode,
  canViewTrace,
  showAgentPicker,
  canToggleAutoRoute,
  theme,
  onSelectAgent,
  onToggleAutoRoute,
  onToggleTrace,
  onToggleTheme,
  onToggleSidebar,
}: TopBarProps) {
  const selectedAgent = getAgentById(selectedAgentId);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/88 px-4 py-3 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/88 md:px-6">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: uiTokens.motion.duration.fast, ease: uiTokens.motion.ease.easeOut }}
            onClick={onToggleSidebar}
            className={cn(
              "rounded-[14px] border border-slate-300 bg-white p-2 text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white lg:hidden",
              uiTokens.shadow.subtle
            )}
            aria-label="Toggle sidebar"
          >
            <Menu size={uiTokens.icon.md} />
          </motion.button>

          <div className="min-w-0">
            <h1 className="py-1 font-display text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100">Global Agent</h1>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">{workspaceMode === "admin" ? "Admin workspace" : "User workspace"}</p>
          </div>

          {showAgentPicker && (
            <AgentPicker
              agents={agents}
              selectedAgentId={selectedAgentId}
              recentAgentIds={recentAgentIds}
              onSelect={onSelectAgent}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge
            label={autoRoute ? "Auto-route active" : "Manual route"}
            tone={autoRoute ? "success" : "neutral"}
            className="hidden sm:inline-flex"
          />
          <StatusBadge label={selectedAgent.name} tone="info" className="hidden lg:inline-flex" />

          {canToggleAutoRoute && (
            <button
              type="button"
              onClick={onToggleAutoRoute}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[14px] border px-2.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                autoRoute
                  ? "border-emerald-300/70 bg-emerald-100 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500"
              )}
              aria-pressed={autoRoute}
              aria-label="Toggle auto-route"
            >
              <Workflow size={uiTokens.icon.sm} />
              <span className="hidden md:inline">Routing</span>
            </button>
          )}

          {canViewTrace && (
            <button
              type="button"
              onClick={onToggleTrace}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[14px] border px-2.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                traceOpen
                  ? "border-sky-300/70 bg-sky-100 text-sky-700 dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-200"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500"
              )}
              aria-pressed={traceOpen}
              aria-label="Toggle trace panel"
            >
              <Activity size={uiTokens.icon.sm} />
              <span className="hidden md:inline">Trace</span>
            </button>
          )}

          <Link
            href="/logout"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[14px] border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white",
              uiTokens.shadow.subtle
            )}
            aria-label="Logout"
          >
            <LogOut size={uiTokens.icon.sm} />
            <span className="hidden md:inline">Logout</span>
          </Link>

          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: uiTokens.motion.duration.fast, ease: uiTokens.motion.ease.easeOut }}
            onClick={onToggleTheme}
            className={cn(
              "rounded-[14px] border border-slate-300 bg-white p-2 text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white",
              uiTokens.shadow.subtle
            )}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <SunMedium size={uiTokens.icon.md} /> : <MoonStar size={uiTokens.icon.md} />}
          </motion.button>
        </div>
      </div>
    </header>
  );
}
