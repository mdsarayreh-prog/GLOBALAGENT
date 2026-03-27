"use client";

import { motion } from "framer-motion";
import { Paperclip } from "lucide-react";

import { getAgentById } from "@/lib/agents";
import { uiTokens } from "@/lib/ui-tokens";
import { cn, formatMessageTime } from "@/lib/utils";
import { ConversationMessage } from "@/types/conversation";

export interface RenderMessage extends ConversationMessage {
  status?: "complete" | "streaming";
}

interface MessageBubbleProps {
  message: RenderMessage;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}

export function MessageBubble({ message, isFirstInGroup, isLastInGroup }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const agent = getAgentById(message.agentId ?? "global");
  const timeLabel = formatMessageTime(message.createdAt);

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: uiTokens.motion.duration.base, ease: uiTokens.motion.ease.easeOut }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start", isFirstInGroup ? "mt-2" : "mt-1")}
      aria-label={`${isUser ? "User" : "Assistant"} message`}
    >
      {!isUser && (
        <div className={cn("mr-2 mt-1 hidden sm:flex", !isFirstInGroup && "opacity-0")} aria-hidden={!isFirstInGroup}>
          <div className="h-8 min-w-8 rounded-[10px] border border-slate-200 bg-slate-100 px-2 text-center text-[11px] font-semibold leading-8 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {isAssistant ? agent.avatar : message.role.slice(0, 1).toUpperCase()}
          </div>
        </div>
      )}

      <div
        className={cn(
          "max-w-[95%] border px-4 py-3 sm:max-w-[84%]",
          uiTokens.shadow.subtle,
          isUser
            ? "border-sky-600 bg-sky-600 text-white dark:border-sky-500/70 dark:bg-sky-500/85"
            : "border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
          isUser
            ? cn(
                "rounded-[18px]",
                isFirstInGroup ? "rounded-tr-[18px]" : "rounded-tr-[10px]",
                isLastInGroup ? "rounded-br-[12px]" : "rounded-br-[10px]"
              )
            : cn(
                "rounded-[18px]",
                isFirstInGroup ? "rounded-tl-[18px]" : "rounded-tl-[10px]",
                isLastInGroup ? "rounded-bl-[12px]" : "rounded-bl-[10px]"
              )
        )}
      >
        {isAssistant && isFirstInGroup && (
          <p className={cn("mb-1.5 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide", agent.accentClass)}>
            {agent.name}
          </p>
        )}

        {message.status === "streaming" && message.contentText.length === 0 ? (
          <div className="space-y-2 py-1">
            <div className="h-3 w-56 animate-shimmer rounded-full bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
            <div className="h-3 w-44 animate-shimmer rounded-full bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
            <TypingIndicator />
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-[15px] leading-7 tracking-[0.005em]">
            {message.contentText}
            {message.status === "streaming" && message.contentText.length > 0 && (
              <span className="caret-blink ml-0.5 inline-block h-4 w-[1.5px] align-middle bg-current" aria-hidden="true" />
            )}
          </p>
        )}

        {message.status === "streaming" && message.contentText.length > 0 && <TypingIndicator compact className="mt-2" />}

        {message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.attachments.map((attachment, index) => (
              <span
                key={attachment.id ?? `${attachment.name}-${index}`}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]",
                  isUser
                    ? "border-white/35 bg-white/15 text-white/95 dark:border-white/35 dark:bg-white/20"
                    : "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                )}
              >
                <Paperclip size={11} />
                <span className="max-w-[180px] truncate">{attachment.name}</span>
                {typeof attachment.sizeBytes === "number" && (
                  <span className={cn("text-[10px]", isUser ? "text-white/80" : "text-slate-500 dark:text-slate-400")}>
                    {formatFileSize(attachment.sizeBytes)}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}

        {isLastInGroup && (
          <p
            suppressHydrationWarning
            className={cn("mt-1.5 text-[11px]", isUser ? "text-white/75 dark:text-sky-100/90" : "text-slate-500 dark:text-slate-400")}
          >
            {timeLabel}
          </p>
        )}
      </div>
    </motion.article>
  );
}

interface TypingIndicatorProps {
  compact?: boolean;
  className?: string;
}

function TypingIndicator({ compact = false, className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-1 text-slate-500 dark:text-slate-400", className)} aria-live="polite">
      {!compact && <span className="text-xs">Assistant is typing</span>}
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((item) => (
          <motion.span
            key={item}
            animate={{ y: [0, -2, 0], opacity: [0.45, 1, 0.45] }}
            transition={{
              duration: 0.9,
              repeat: Number.POSITIVE_INFINITY,
              ease: uiTokens.motion.ease.easeInOut,
              delay: item * 0.1,
            }}
            className="h-1.5 w-1.5 rounded-full bg-current"
          />
        ))}
      </div>
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
