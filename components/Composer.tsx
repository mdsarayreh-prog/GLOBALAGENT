"use client";

import { motion } from "framer-motion";
import { AtSign, CircleHelp, Paperclip, Plus, SendHorizontal, ShieldCheck, Sparkles, X } from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";

import { ActionChip } from "@/components/ui/ActionChip";
import { uiTokens } from "@/lib/ui-tokens";
import { cn } from "@/lib/utils";
import { AgentId } from "@/types/chat";
import { AttachmentMetadata } from "@/types/conversation";

interface ComposerProps {
  placeholder: string;
  agentName: string;
  autoRoute: boolean;
  draft: string;
  mentionAgents: Array<{ id: AgentId; label: string }>;
  disabled?: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: (payload: { content: string; attachments: AttachmentMetadata[] }) => Promise<void> | void;
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
  onMentionAgent,
}: ComposerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [actionBarOpen, setActionBarOpen] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentMetadata[]>([]);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!textAreaRef.current) {
      return;
    }

    textAreaRef.current.style.height = "auto";
    textAreaRef.current.style.height = `${Math.min(textAreaRef.current.scrollHeight, 170)}px`;
  }, [draft]);

  async function handleSubmit() {
    const content = draft.trim();
    if ((!content && attachments.length === 0) || disabled || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const normalizedContent = content || `Please review the attached file${attachments.length > 1 ? "s" : ""}.`;
      await onSubmit({ content: normalizedContent, attachments });
      onDraftChange("");
      setAttachments([]);
      setActionBarOpen(false);
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
    setActionBarOpen(false);
    textAreaRef.current?.focus();
  }

  function applyMention(agentId: AgentId) {
    onMentionAgent(agentId);
    const token = `@${agentId} `;
    if (draft.toLowerCase().includes(token.trim())) {
      return;
    }

    onDraftChange(draft ? `${draft} ${token}` : token);
    setActionBarOpen(false);
    textAreaRef.current?.focus();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    setAttachments((current) => {
      const existing = new Set(current.map((item) => `${item.name}-${item.sizeBytes ?? 0}-${item.mimeType ?? ""}`));
      const next = [...current];

      for (const file of files) {
        const key = `${file.name}-${file.size}-${file.type}`;
        if (existing.has(key)) {
          continue;
        }

        next.push({
          id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : key,
          name: file.name,
          mimeType: file.type || undefined,
          sizeBytes: file.size,
        });
        existing.add(key);
      }

      return next;
    });

    event.target.value = "";
    setActionBarOpen(false);
    textAreaRef.current?.focus();
  }

  function removeAttachment(attachmentId: string | undefined) {
    if (!attachmentId) {
      return;
    }

    setAttachments((current) => current.filter((item) => item.id !== attachmentId));
  }

  const isDisabled = disabled || submitting;
  const hasDraft = Boolean(draft.trim());
  const hasAttachments = attachments.length > 0;
  const canMentionAgents = mentionAgents.length > 0;
  const canSubmit = (hasDraft || hasAttachments) && !isDisabled;

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

      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachments.map((attachment) => (
            <span
              key={attachment.id ?? attachment.name}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Paperclip size={11} />
              <span className="max-w-[180px] truncate">{attachment.name}</span>
              {typeof attachment.sizeBytes === "number" && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{formatFileSize(attachment.sizeBytes)}</span>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(attachment.id)}
                className="rounded-full p-0.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                aria-label={`Remove ${attachment.name}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {actionBarOpen && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: uiTokens.motion.duration.base, ease: uiTokens.motion.ease.easeOut }}
          className="mb-2 rounded-[16px] border border-slate-300 bg-white/90 p-2.5 dark:border-slate-700 dark:bg-slate-900/85"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Quick Actions</p>
            <button
              type="button"
              onClick={() => setActionBarOpen(false)}
              className="rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="Close action bar"
            >
              <X size={12} />
            </button>
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

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-[12px] border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700 dark:hover:text-white"
            disabled={isDisabled}
          >
            <Paperclip size={12} />
            Attach File
          </button>
        </motion.div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={isDisabled}
        aria-label="Attach file input"
      />

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => setActionBarOpen((value) => !value)}
          className={cn(
            "rounded-[14px] border p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60",
            actionBarOpen
              ? "border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-400/60 dark:bg-sky-500/20 dark:text-sky-200"
              : "border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
          )}
          aria-label={actionBarOpen ? "Close action bar" : "Open action bar"}
          title={actionBarOpen ? "Close action bar" : "Open action bar"}
          disabled={isDisabled}
        >
          <Plus size={uiTokens.icon.md} />
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
          whileHover={{ scale: canSubmit ? 1.01 : 1 }}
          whileTap={{ scale: canSubmit ? 0.97 : 1 }}
          transition={{ duration: uiTokens.motion.duration.fast, ease: uiTokens.motion.ease.easeOut }}
          onClick={() => void handleSubmit()}
          className={cn(
            "rounded-[14px] p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed",
            canSubmit ? "bg-sky-500 text-white hover:bg-sky-600" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
          )}
          disabled={!canSubmit || isDisabled}
          aria-label="Send message"
        >
          <SendHorizontal size={uiTokens.icon.md} />
        </motion.button>
      </div>

      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-500">
        {canMentionAgents
          ? "Use + for workflows, @mentions, and attachments. Enter to send, Shift+Enter for newline."
          : "Use + for workflows and attachments. Enter to send, Shift+Enter for newline."}
      </p>
    </div>
  );
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes}B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.round(sizeBytes / 1024)}KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)}MB`;
}
