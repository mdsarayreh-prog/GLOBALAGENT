"use client";

import { motion } from "framer-motion";
import { AtSign, CircleHelp, Paperclip, SendHorizontal, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ActionChip } from "@/components/ui/ActionChip";
import { uiTokens } from "@/lib/ui-tokens";
import { cn } from "@/lib/utils";
import { AgentId } from "@/types/chat";

interface ComposerProps {
  placeholder: string;
  agentName: string;
  autoRoute: boolean;
  draft: string;
  mentionAgents: Array<{ id: AgentId; label: string }>;
  disabled?: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: (content: string) => Promise<void> | void;
  onAttach: () => void;
  onMentionAgent: (agentId: AgentId) => void;
}

const QUICK_ACTION_PROMPTS: Record<string, string> = {
  Draft: "Draft a business-ready response with clear owners and due dates.",
  Summarize: "Summarize this request into decisions, risks, and next actions.",
  Analyze: "Analyze root cause, impact, and recommended mitigation steps.",
  "Create Request": "Create a structured enterprise request with SLA and approvals.",
  "Check Inventory": "Check inventory exposure, lead-time risk, and replenishment actions.",
};

export function Composer({
  placeholder,
  agentName,
  autoRoute,
  draft,
  mentionAgents,
  disabled = false,
  onDraftChange,
  onSubmit,
  onAttach,
  onMentionAgent,
}: ComposerProps) {
  const [submitting, setSubmitting] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!textAreaRef.current) {
      return;
    }

    textAreaRef.current.style.height = "auto";
    textAreaRef.current.style.height = `${Math.min(textAreaRef.current.scrollHeight, 170)}px`;
  }, [draft]);

  async function handleSubmit() {
    const content = draft.trim();
    if (!content || disabled || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(content);
      onDraftChange("");
    } finally {
      setSubmitting(false);
      textAreaRef.current?.focus();
    }
  }

  function applyQuickAction(label: string) {
    const prompt = QUICK_ACTION_PROMPTS[label];
    if (!prompt) {
      return;
    }

    onDraftChange(draft ? `${draft}\n${prompt}` : prompt);
    textAreaRef.current?.focus();
  }

  function applyMention(agentId: AgentId) {
    onMentionAgent(agentId);
    const token = `@${agentId} `;
    if (draft.toLowerCase().includes(token.trim())) {
      return;
    }

    onDraftChange(draft ? `${draft} ${token}` : token);
    textAreaRef.current?.focus();
  }

  const isDisabled = disabled || submitting;
  const hasDraft = Boolean(draft.trim());
  const canMentionAgents = mentionAgents.length > 0;

  return (
    <div
      className={cn(
        "border border-slate-300 bg-white/95 p-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95",
        uiTokens.radius.panel,
        uiTokens.shadow.medium
      )}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          title="Selected agent for this thread"
        >
          <ShieldCheck size={12} />
          {agentName}
        </span>

        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium",
            autoRoute
              ? "border-emerald-300/70 bg-emerald-100 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200"
              : "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          )}
          title="Auto-route status"
        >
          <CircleHelp size={12} />
          Auto-route {autoRoute ? "ON" : "OFF"}
        </span>
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {Object.keys(QUICK_ACTION_PROMPTS).map((label) => (
          <ActionChip key={label} label={label} onClick={() => applyQuickAction(label)} icon={<Sparkles size={12} />} />
        ))}
      </div>

      {canMentionAgents && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {mentionAgents.map((agent) => (
            <ActionChip
              key={agent.id}
              label={`@${agent.label}`}
              onClick={() => applyMention(agent.id)}
              icon={<AtSign size={12} />}
              ariaLabel={`Mention ${agent.label}`}
            />
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={onAttach}
          className="rounded-[14px] border border-slate-300 p-2 text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
          aria-label="Attach file"
          title="Attach file (mocked in v1)"
          disabled={isDisabled}
        >
          <Paperclip size={uiTokens.icon.md} />
        </button>

        <textarea
          ref={textAreaRef}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder={placeholder}
          className={cn(
            "max-h-44 min-h-[48px] flex-1 resize-none border border-slate-300 bg-white px-3 py-2.5 text-[15px] leading-6 text-slate-900 outline-none transition-colors placeholder:text-slate-500 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900",
            uiTokens.radius.control
          )}
          rows={1}
          disabled={isDisabled}
          aria-label="Message input"
        />

        <motion.button
          type="button"
          whileHover={{ scale: hasDraft ? 1.01 : 1 }}
          whileTap={{ scale: hasDraft ? 0.97 : 1 }}
          transition={{ duration: uiTokens.motion.duration.fast, ease: uiTokens.motion.ease.easeOut }}
          onClick={() => void handleSubmit()}
          className={cn(
            "rounded-[14px] p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed",
            hasDraft && !isDisabled ? "bg-sky-500 text-white hover:bg-sky-600" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
          )}
          disabled={!hasDraft || isDisabled}
          aria-label="Send message"
        >
          <SendHorizontal size={uiTokens.icon.md} />
        </motion.button>
      </div>

      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-500">
        {canMentionAgents
          ? "Enter to send, Shift+Enter for newline. Use @mentions to force specialist routing."
          : "Enter to send, Shift+Enter for newline. Specialist routing is handled by Global Agent."}
      </p>
    </div>
  );
}

