"use client";

import { motion } from "framer-motion";
import {
  Archive,
  ChevronLeft,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  PinOff,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { uiTokens } from "@/lib/ui-tokens";
import { cn } from "@/lib/utils";
import { ConversationListItem } from "@/types/conversation";

interface SidebarProps {
  conversations: ConversationListItem[];
  activeConversationId: string;
  workspaceMode: "user" | "admin";
  collapsed: boolean;
  mobile: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNewChat: () => void;
  onSelectConversation: (conversationId: string) => void;
  onTogglePin: (conversationId: string, nextPinned: boolean) => void;
  onArchiveConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

function getRecencyGroupLabel(dateIso: string): "Today" | "Yesterday" | "Last 7 Days" | "Older" {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return "Older";
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMessageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.floor((startOfToday - startOfMessageDay) / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return "Last 7 Days";
  }

  return "Older";
}

function buildRecencyGroups(conversations: ConversationListItem[]) {
  const groups: Record<string, ConversationListItem[]> = {
    Today: [],
    Yesterday: [],
    "Last 7 Days": [],
    Older: [],
  };

  for (const conversation of conversations) {
    const label = getRecencyGroupLabel(conversation.lastMessageAt);
    groups[label].push(conversation);
  }

  return groups;
}

export function Sidebar({
  conversations,
  activeConversationId,
  workspaceMode,
  collapsed,
  mobile,
  searchValue,
  onSearchChange,
  onNewChat,
  onSelectConversation,
  onTogglePin,
  onArchiveConversation,
  onDeleteConversation,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  const pinnedConversations = conversations.filter((conversation) => conversation.isPinned);
  const unpinnedConversations = conversations.filter((conversation) => !conversation.isPinned);
  const recencyGroups = buildRecencyGroups(unpinnedConversations);

  const title = workspaceMode === "admin" ? "Global Agent Control" : "Global Agent";
  const subtitle =
    workspaceMode === "admin"
      ? "Conversation history + routing governance"
      : "Persistent chats with auto-routing traceability";

  return (
    <aside className="flex h-full flex-col gap-4 bg-slate-100/95 p-3 text-slate-700 dark:bg-slate-950/95 dark:text-slate-200">
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
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <ShieldCheck size={12} />
          Durable server history enabled
        </div>
      )}

      {!collapsed ? (
        <label className="relative block">
          <Search size={uiTokens.icon.sm} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500" />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search conversations"
            className={cn(
              "h-10 w-full border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
              uiTokens.radius.control
            )}
            aria-label="Search conversations"
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
        {!collapsed && <span>New chat</span>}
        {collapsed && <CollapsedTooltip show={!mobile} label="New chat" />}
      </motion.button>

      <section className="min-h-0 flex-1 space-y-2 overflow-hidden" aria-label="Conversation history">
        {!collapsed && <SectionHeader title="History" />}

        <div className="scrollbar-thin h-full space-y-3 overflow-y-auto pr-1">
          {pinnedConversations.length > 0 && (
            <div className="space-y-1.5">
              {!collapsed && <SubHeader title="Pinned" />}
              {pinnedConversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  collapsed={collapsed}
                  mobile={mobile}
                  active={conversation.id === activeConversationId}
                  conversation={conversation}
                  onSelect={onSelectConversation}
                  onTogglePin={onTogglePin}
                  onArchive={onArchiveConversation}
                  onDelete={onDeleteConversation}
                />
              ))}
            </div>
          )}

          {(["Today", "Yesterday", "Last 7 Days", "Older"] as const).map((groupName) => {
            const groupItems = recencyGroups[groupName];
            if (groupItems.length === 0) {
              return null;
            }

            return (
              <div key={groupName} className="space-y-1.5">
                {!collapsed && <SubHeader title={groupName} />}
                {groupItems.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    collapsed={collapsed}
                    mobile={mobile}
                    active={conversation.id === activeConversationId}
                    conversation={conversation}
                    onSelect={onSelectConversation}
                    onTogglePin={onTogglePin}
                    onArchive={onArchiveConversation}
                    onDelete={onDeleteConversation}
                  />
                ))}
              </div>
            );
          })}

          {conversations.length === 0 && !collapsed && (
            <div className="rounded-[14px] border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-500">
              No conversations yet.
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}

interface ConversationItemProps {
  conversation: ConversationListItem;
  active: boolean;
  collapsed: boolean;
  mobile: boolean;
  onSelect: (conversationId: string) => void;
  onTogglePin: (conversationId: string, nextPinned: boolean) => void;
  onArchive: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
}

function ConversationItem({
  conversation,
  active,
  collapsed,
  mobile,
  onSelect,
  onTogglePin,
  onArchive,
  onDelete,
}: ConversationItemProps) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onSelect(conversation.id)}
        className={cn(
          "relative w-full overflow-hidden px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
          uiTokens.radius.control,
          active
            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-100 dark:text-slate-900"
            : "text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        )}
        title={collapsed ? conversation.title : undefined}
        aria-label={`Open ${conversation.title}`}
      >
        <span
          className={cn(
            "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full",
            active ? "bg-emerald-500" : "bg-transparent"
          )}
          aria-hidden="true"
        />
        {collapsed ? (
          <span className="text-[11px] font-semibold">{conversation.title.slice(0, 2).toUpperCase()}</span>
        ) : (
          <>
            <span className="block truncate text-sm font-medium leading-5">{conversation.title}</span>
            <span className={cn("block truncate text-[11px]", active ? "text-slate-600" : "text-slate-500 dark:text-slate-500")}>
              {conversation.previewText || `${conversation.messageCount} message${conversation.messageCount === 1 ? "" : "s"}`}
            </span>
          </>
        )}
      </button>

      {!collapsed && (
        <div className="pointer-events-none absolute right-1 top-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onTogglePin(conversation.id, !conversation.isPinned);
            }}
            className="pointer-events-auto rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label={conversation.isPinned ? "Unpin conversation" : "Pin conversation"}
            title={conversation.isPinned ? "Unpin" : "Pin"}
          >
            {conversation.isPinned ? <PinOff size={12} /> : <Pin size={12} />}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onArchive(conversation.id);
            }}
            className="pointer-events-auto rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Archive conversation"
            title="Archive"
          >
            <Archive size={12} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(conversation.id);
            }}
            className="pointer-events-auto rounded-md p-1 text-red-500/80 hover:bg-red-50 hover:text-red-700 dark:text-red-300/80 dark:hover:bg-red-950/40 dark:hover:text-red-200"
            aria-label="Delete conversation"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      <CollapsedTooltip show={collapsed && !mobile} label={conversation.title} />
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
}

function SectionHeader({ title }: SectionHeaderProps) {
  return <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">{title}</p>;
}

function SubHeader({ title }: SectionHeaderProps) {
  return <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">{title}</p>;
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
