"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Clock3 } from "lucide-react";
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import { uiTokens } from "@/lib/ui-tokens";
import { cn } from "@/lib/utils";
import { Agent, AgentId } from "@/types/chat";

interface AgentPickerProps {
  agents: Agent[];
  selectedAgentId: AgentId;
  recentAgentIds?: AgentId[];
  onSelect: (agentId: AgentId) => void;
}

export function AgentPicker({ agents, selectedAgentId, recentAgentIds = [], onSelect }: AgentPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? agents[0],
    [agents, selectedAgentId]
  );

  const recentAgents = useMemo(() => {
    const seen = new Set<AgentId>();
    const normalized: Agent[] = [];

    for (const agentId of recentAgentIds) {
      if (seen.has(agentId)) {
        continue;
      }

      const agent = agents.find((item) => item.id === agentId);
      if (!agent) {
        continue;
      }

      seen.add(agentId);
      normalized.push(agent);

      if (normalized.length >= 3) {
        break;
      }
    }

    return normalized;
  }, [agents, recentAgentIds]);

  const otherAgents = useMemo(
    () => agents.filter((agent) => !recentAgents.some((recentAgent) => recentAgent.id === agent.id)),
    [agents, recentAgents]
  );

  const options = useMemo(() => [...recentAgents, ...otherAgents], [recentAgents, otherAgents]);

  const selectedIndex = useMemo(
    () => options.findIndex((agent) => agent.id === selectedAgentId),
    [options, selectedAgentId]
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!isOpen || options.length === 0) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % options.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + options.length) % options.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const agent = options[activeIndex];
      if (agent) {
        onSelect(agent.id);
      }
      setIsOpen(false);
    }
  }

  function renderOption(agent: Agent, index: number) {
    const isSelected = agent.id === selectedAgentId;
    const isActive = index === activeIndex;

    return (
      <li key={agent.id}>
        <button
          type="button"
          role="option"
          aria-selected={isSelected}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => {
            onSelect(agent.id);
            setIsOpen(false);
          }}
          className={cn(
            "flex w-full items-start justify-between gap-2 rounded-[14px] px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
            isActive ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-100 dark:hover:bg-slate-800/70"
          )}
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{agent.name}</span>
            <span className="mt-0.5 block truncate text-xs leading-5 text-slate-600 dark:text-slate-400">{agent.description}</span>
          </span>
          {isSelected && <Check size={uiTokens.icon.sm} className="mt-0.5 text-emerald-600 dark:text-emerald-300" />}
        </button>
      </li>
    );
  }

  return (
    <div className="relative" onKeyDown={onKeyDown}>
      <motion.button
        ref={buttonRef}
        type="button"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: uiTokens.motion.duration.fast, ease: uiTokens.motion.ease.easeOut }}
        onClick={() => {
          setIsOpen((current) => {
            const next = !current;
            if (next) {
              setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
            }
            return next;
          });
        }}
        className={cn(
          "flex min-w-[16rem] items-center justify-between gap-3 border border-slate-300 bg-white/90 px-3 py-2.5 text-left transition-colors hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-900/90 dark:hover:border-slate-500",
          uiTokens.radius.card,
          uiTokens.shadow.subtle
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select active agent"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="rounded-xl bg-slate-100 px-2 py-1 text-[11px] font-semibold tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {selectedAgent.avatar}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedAgent.name}</span>
            <span className="block truncate text-[11px] text-slate-600 dark:text-slate-400">{selectedAgent.description}</span>
          </span>
        </span>
        <ChevronDown
          size={uiTokens.icon.md}
          className={cn("shrink-0 text-slate-500 transition-transform dark:text-slate-400", isOpen && "rotate-180 text-sky-600 dark:text-sky-300")}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -6, scale: 0.99 }}
            animate={{ opacity: 1, y: 8, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: uiTokens.motion.duration.base, ease: uiTokens.motion.ease.easeOut }}
            className={cn(
              "absolute z-30 mt-1.5 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden border border-slate-300 bg-white/95 p-1.5 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950/95",
              uiTokens.radius.panel,
              uiTokens.shadow.medium
            )}
          >
            <div className="scrollbar-thin max-h-80 overflow-y-auto" role="listbox" aria-label="Agent options">
              {recentAgents.length > 0 && (
                <div className="mb-1 border-b border-slate-200 px-2 pb-2 dark:border-slate-800">
                  <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">
                    <Clock3 size={12} />
                    Recently Used
                  </p>
                  <ul>{recentAgents.map((agent, index) => renderOption(agent, index))}</ul>
                </div>
              )}

              <div className="px-2 pb-1 pt-1">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">All Agents</p>
                <ul>
                  {otherAgents.map((agent) => {
                    const index = options.findIndex((item) => item.id === agent.id);
                    return renderOption(agent, index);
                  })}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


