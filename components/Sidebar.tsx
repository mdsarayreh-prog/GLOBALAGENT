"use client";

import { motion } from "framer-motion";
import { ChevronLeft, MessageSquarePlus, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { uiTokens } from "@/lib/ui-tokens";
import { cn } from "@/lib/utils";
import { Agent, AgentId, Thread } from "@/types/chat";

interface SidebarProps {
  agents: Agent[];
  threads: Thread[];
  activeThreadId: string;
  selectedAgentId: AgentId;
  workspaceMode: "user" | "admin";
  showAgentSelection?: boolean;
  collapsed: boolean;
  mobile: boolean;
  onNewChat: () => void;
  onSelectThread: (threadId: string) => void;
  onSelectAgent: (agentId: AgentId) => void;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

export function Sidebar({
  agents,
  threads,
  activeThreadId,
  selectedAgentId,
  workspaceMode,
  showAgentSelection = true,
  collapsed,
  mobile,
  onNewChat,
  onSelectThread,
  onSelectAgent,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  const [searchValue, setSearchValue] = useState("");
  const [isHydrating, setIsHydrating] = useState(true);
  const title = workspaceMode === "admin" ? "Global Agent Control" : "Global Agent";
  const subtitle =
    workspaceMode === "admin"
      ? "Governed multi-agent operations workspace"
      : "Global Agent auto-routes your requests to the right specialist";

  useEffect(() => {
    const timer = window.setTimeout(() => setIsHydrating(false), 420);
    return () => window.clearTimeout(timer);
  }, []);

  const searchTerm = searchValue.trim().toLowerCase();

  const filteredAgents = useMemo(() => {
    if (!searchTerm) {
      return agents;
    }

    return agents.filter((agent) => {
      const haystack = [agent.name, agent.description, agent.capabilities.join(" ")].join(" ").toLowerCase();
      return haystack.includes(searchTerm);
    });
  }, [agents, searchTerm]);

  const filteredThreads = useMemo(() => {
    if (!searchTerm) {
      return threads;
    }

    return threads.filter((thread) => thread.title.toLowerCase().includes(searchTerm));
  }, [threads, searchTerm]);

  return (
    <aside className="flex h-full flex-col gap-4 bg-slate-100/95 p-3 text-slate-700 dark:bg-slate-950/95 dark:text-slate-200" aria-label="Sidebar navigation">
      <div className="flex items-center justify-between">
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold tracking-tight text-slate-900 dark:text-white">{title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
        )}

        <button
          type="button"
          onClick={mobile ? onCloseMobile : onToggleCollapse}
          className="rounded-[14px] p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label={mobile ? "Close sidebar" : "Collapse sidebar"}
        >
          {mobile ? (
            <ChevronLeft size={uiTokens.icon.md} />
          ) : collapsed ? (
            <PanelLeftOpen size={uiTokens.icon.md} />
          ) : (
            <PanelLeftClose size={uiTokens.icon.md} />
          )}
        </button>
      </div>

      {!collapsed && (
        <StatusBadge
          label={workspaceMode === "admin" ? "Governance mode" : "Auto-route only"}
          tone={workspaceMode === "admin" ? "info" : "success"}
          className="w-fit"
        />
      )}

      {!collapsed ? (
        <label className="relative block">
          <Search size={uiTokens.icon.sm} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500" />
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={showAgentSelection ? "Search agents, chats, templates" : "Search chats and templates"}
            className={cn(
              "h-10 w-full border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
              uiTokens.radius.control
            )}
            aria-label="Search agents and chats"
          />
        </label>
      ) : (
        <div className="group relative">
          <div className="flex h-10 items-center justify-center rounded-[14px] border border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            <Search size={uiTokens.icon.md} />
          </div>
          <CollapsedTooltip show={!mobile} label="Expand sidebar to search" />
        </div>
      )}

      <motion.button
        type="button"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: uiTokens.motion.duration.fast, ease: uiTokens.motion.ease.easeOut }}
        onClick={onNewChat}
        className={cn(
          "relative flex items-center gap-2 border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:border-sky-500/50 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-sky-500/50 dark:hover:bg-slate-800/80",
          uiTokens.radius.card,
          collapsed && "justify-center px-2"
        )}
      >
        <MessageSquarePlus size={uiTokens.icon.md} />
        {!collapsed && <span>New mission thread</span>}
        {collapsed && <CollapsedTooltip show={!mobile} label="New mission thread" />}
      </motion.button>

      {showAgentSelection ? (
        <section className="space-y-2" aria-label="Agents section">
          {!collapsed && <SectionHeader title="Specialist Agents" />}
          <div className="space-y-1">
            {filteredAgents.length === 0 && !collapsed ? (
              <EmptyList copy="No matching specialist found." />
            ) : (
              filteredAgents.map((agent) => {
                const active = selectedAgentId === agent.id;

                return (
                  <div key={agent.id} className="group relative">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      transition={{ duration: uiTokens.motion.duration.fast, ease: uiTokens.motion.ease.easeOut }}
                      onClick={() => onSelectAgent(agent.id)}
                      className={cn(
                        "relative flex w-full items-center gap-2 overflow-hidden px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                        uiTokens.radius.control,
                        active
                          ? "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200"
                          : "text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      )}
                      aria-label={`Switch to ${agent.name}`}
                      title={collapsed ? agent.name : undefined}
                    >
                      <span
                        className={cn(
                          "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full",
                          active ? "bg-sky-500 dark:bg-sky-400" : "bg-transparent"
                        )}
                        aria-hidden="true"
                      />
                      <span
                        className={cn(
                          "min-w-9 rounded-lg px-2 py-1 text-center text-[11px] font-semibold",
                          active
                            ? "bg-sky-200 text-sky-800 dark:bg-sky-500/20 dark:text-sky-100"
                            : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        )}
                      >
                        {agent.avatar}
                      </span>
                      {!collapsed && (
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium leading-5">{agent.name}</span>
                          <span className="block truncate text-[11px] text-slate-500 dark:text-slate-500">{agent.description}</span>
                        </span>
                      )}
                    </motion.button>
                    <CollapsedTooltip show={collapsed && !mobile} label={agent.name} />
                  </div>
                );
              })
            )}
          </div>
        </section>
      ) : (
        !collapsed && (
          <div className="rounded-[14px] border border-slate-300 bg-white/70 px-3 py-2 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
            Global Agent is locked as the entry point. Specialist routing is handled automatically.
          </div>
        )
      )}

      <section className="min-h-0 flex-1 space-y-2 overflow-hidden" aria-label="Chats section">
        {!collapsed && <SectionHeader title="Mission Threads" />}
        <div className="scrollbar-thin h-full space-y-1 overflow-y-auto pr-1">
          {isHydrating ? (
            Array.from({ length: collapsed ? 4 : 6 }).map((_, index) => (
              <div
                key={`chat-skeleton-${index}`}
                className={cn(
                  "h-10 animate-shimmer rounded-[14px] border border-slate-300 bg-gradient-to-r from-slate-100 via-white to-slate-100 bg-[length:200%_100%] dark:border-slate-800 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900",
                  collapsed && "h-9"
                )}
              />
            ))
          ) : filteredThreads.length === 0 ? (
            !collapsed && <EmptyList copy={searchTerm ? "No thread matches the filter." : "No threads yet."} />
          ) : (
            filteredThreads.map((thread) => {
              const active = thread.id === activeThreadId;

              return (
                <div key={thread.id} className="group relative">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ duration: uiTokens.motion.duration.fast, ease: uiTokens.motion.ease.easeOut }}
                    onClick={() => onSelectThread(thread.id)}
                    className={cn(
                      "relative w-full overflow-hidden px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                      uiTokens.radius.control,
                      active
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-100 dark:text-slate-900"
                        : "text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                    )}
                    title={collapsed ? thread.title : undefined}
                    aria-label={`Open ${thread.title}`}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full",
                        active ? "bg-emerald-500" : "bg-transparent"
                      )}
                      aria-hidden="true"
                    />
                    {collapsed ? (
                      <span className="text-[11px] font-semibold">{thread.title.slice(0, 2).toUpperCase()}</span>
                    ) : (
                      <>
                        <span className="block truncate text-sm font-medium leading-5">{thread.title}</span>
                        <span
                          className={cn(
                            "block truncate text-[11px]",
                            active ? "text-slate-600" : "text-slate-500 dark:text-slate-500"
                          )}
                        >
                          {thread.messages.length} message{thread.messages.length === 1 ? "" : "s"}
                        </span>
                      </>
                    )}
                  </motion.button>
                  <CollapsedTooltip show={collapsed && !mobile} label={thread.title} />
                </div>
              );
            })
          )}
        </div>
      </section>

      {!collapsed && (
        <div className="flex items-center gap-2 rounded-[14px] border border-slate-300 bg-white/70 px-2.5 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
          <ShieldCheck size={13} />
          Audit trail and route governance enabled
        </div>
      )}
    </aside>
  );
}

interface SectionHeaderProps {
  title: string;
}

function SectionHeader({ title }: SectionHeaderProps) {
  return <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">{title}</p>;
}

interface EmptyListProps {
  copy: string;
}

function EmptyList({ copy }: EmptyListProps) {
  return (
    <div className="rounded-[14px] border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-500">
      {copy}
    </div>
  );
}

interface CollapsedTooltipProps {
  show: boolean;
  label: string;
}

function CollapsedTooltip({ show, label }: CollapsedTooltipProps) {
  if (!show) {
    return null;
  }

  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-[10px] border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 shadow-lg group-hover:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      {label}
    </span>
  );
}


