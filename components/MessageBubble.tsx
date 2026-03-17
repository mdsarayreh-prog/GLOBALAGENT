"use client";

import { motion } from "framer-motion";

import { getAgentById } from "@/lib/agents";
import { uiTokens } from "@/lib/ui-tokens";
import { cn, formatMessageTime } from "@/lib/utils";
import { Message } from "@/types/chat";

interface MessageBubbleProps {
  message: Message;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  onCopy?: (message: Message) => void;
  onRetry?: (message: Message) => void;
  onReroute?: (message: Message) => void;
}

export function MessageBubble({ message, isFirstInGroup, isLastInGroup }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const agent = getAgentById(message.agentId);
  const timeLabel = formatMessageTime(message.createdAt);

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: uiTokens.motion.duration.base, ease: uiTokens.motion.ease.easeOut }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start", isFirstInGroup ? "mt-2" : "mt-1")}
      aria-label={`${isUser ? "User" : agent.name} message`}
    >
      {!isUser && (
        <div className={cn("mr-2 mt-1 hidden sm:flex", !isFirstInGroup && "opacity-0") } aria-hidden={!isFirstInGroup}>
          <div className="h-8 min-w-8 rounded-[10px] border border-slate-200 bg-slate-100 px-2 text-center text-[11px] font-semibold leading-8 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {agent.avatar}
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
        {!isUser && isFirstInGroup && (
          <p className={cn("mb-1.5 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide", agent.accentClass)}>
            {agent.name}
          </p>
        )}

        {message.status === "streaming" && message.content.length === 0 ? (
          <div className="space-y-2 py-1">
            <div className="h-3 w-56 rounded-full bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
            <div className="h-3 w-44 rounded-full bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
            <TypingIndicator />
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-[15px] leading-7 tracking-[0.005em]">
            {message.content}
            {message.status === "streaming" && message.content.length > 0 && (
              <span className="caret-blink ml-0.5 inline-block h-4 w-[1.5px] align-middle bg-current" aria-hidden="true" />
            )}
          </p>
        )}

        {message.status === "streaming" && message.content.length > 0 && <TypingIndicator compact className="mt-2" />}

        {isLastInGroup && (
          <p
            suppressHydrationWarning
            className={cn(
              "mt-1.5 text-[11px]",
              isUser ? "text-white/75 dark:text-sky-100/90" : "text-slate-500 dark:text-slate-400"
            )}
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
