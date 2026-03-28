"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, BriefcaseBusiness } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Composer } from "@/components/Composer";
import { MessageBubble, RenderMessage } from "@/components/MessageBubble";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { TracePanel } from "@/components/TracePanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ClientRequestContextHeaders,
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  listMessages,
  listTraceEvents,
  patchConversation,
  postMessage,
} from "@/lib/conversationsApi";
import { getAgentById, getEnabledAgents } from "@/lib/agents";
import { uiTokens } from "@/lib/ui-tokens";
import { cn, createId } from "@/lib/utils";
import { AgentId } from "@/types/chat";
import { AttachmentMetadata, ConversationListItem, ConversationRecord, TraceEventRecord } from "@/types/conversation";

interface ChatProps {
  workspaceMode: "user" | "admin";
  requestContextHeaders?: ClientRequestContextHeaders;
}

function toListItem(conversation: ConversationRecord): ConversationListItem {
  return {
    ...conversation,
    previewText: "",
    messageCount: 0,
  };
}

export function Chat({ workspaceMode, requestContextHeaders }: ChatProps) {
  const isAdminWorkspace = workspaceMode === "admin";
  const agents = useMemo(() => getEnabledAgents(), []);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>("");
  const [activeConversation, setActiveConversation] = useState<ConversationRecord | null>(null);
  const [messages, setMessages] = useState<RenderMessage[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId>("global");
  const [recentAgentIds, setRecentAgentIds] = useState<AgentId[]>(["global"]);
  const [autoRoute, setAutoRoute] = useState(true);
  const [trace, setTrace] = useState<TraceEventRecord | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isStreaming, setIsStreaming] = useState(false);
  const [traceOpen, setTraceOpen] = useState(workspaceMode === "admin");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const bootstrapped = useRef(false);

  const selectedAgent = getAgentById(selectedAgentId);

  const loadConversation = useCallback(
    async (conversationId: string) => {
      const [conversation, messageResponse, traceResponse] = await Promise.all([
        getConversation(conversationId, requestContextHeaders),
        listMessages(conversationId, { limit: 250, offset: 0 }, requestContextHeaders),
        listTraceEvents(conversationId, undefined, requestContextHeaders),
      ]);

      setActiveConversation(conversation);
      setActiveConversationId(conversation.id);
      setMessages(messageResponse.data.map((message) => ({ ...message, status: "complete" as const })));
      setTrace(traceResponse.data[0] ?? null);

      const nextAgent = isAdminWorkspace ? conversation.defaultAgentId : "global";
      setSelectedAgentId(nextAgent);
      setAutoRoute(isAdminWorkspace ? conversation.autoRouteEnabled : true);
      setRecentAgentIds((current) => [nextAgent, ...current.filter((id) => id !== nextAgent)].slice(0, 4));
    },
    [isAdminWorkspace, requestContextHeaders]
  );

  const refreshConversations = useCallback(
    async (search: string, ensureOne = false) => {
        const response = await listConversations({ limit: 120, offset: 0, search: search || undefined }, requestContextHeaders);
      let items = response.data;

      if (ensureOne && !search && items.length === 0) {
        const created = await createConversation({
          defaultAgentId: "global",
          autoRouteEnabled: true,
          title: "New chat",
        }, requestContextHeaders);
        items = [toListItem(created)];
      }

      setConversations(items);
      return items;
    },
    [requestContextHeaders]
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");

    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");

    const handleViewportChange = (matches: boolean) => {
      setIsMobile(matches);
      if (matches) {
        setSidebarCollapsed(true);
      } else {
        setMobileSidebarOpen(false);
      }
    };

    handleViewportChange(media.matches);

    const listener = (event: MediaQueryListEvent) => handleViewportChange(event.matches);
    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    const element = messageScrollRef.current;
    if (!element) {
      return;
    }

    const handleScroll = () => {
      const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
      setShowScrollToLatest(distance > 220);
    };

    handleScroll();
    element.addEventListener("scroll", handleScroll, { passive: true });

    return () => element.removeEventListener("scroll", handleScroll);
  }, [activeConversationId]);

  useEffect(() => {
    const element = messageScrollRef.current;
    if (!element) {
      return;
    }

    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (distance < 220 || isStreaming) {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: isStreaming ? "auto" : "smooth",
      });
    }
  }, [messages, isStreaming]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setIsBootstrapping(true);
      try {
        const items = await refreshConversations("", true);
        if (cancelled) {
          return;
        }

        const targetId = [...items]
          .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())[0]
          ?.id;
        if (targetId) {
          await loadConversation(targetId);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Failed to load conversations";
          setBanner(message);
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
          bootstrapped.current = true;
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [loadConversation, refreshConversations]);

  useEffect(() => {
    if (!bootstrapped.current) {
      return;
    }

    const timer = setTimeout(() => {
      void refreshConversations(searchValue, false);
    }, 280);

    return () => clearTimeout(timer);
  }, [refreshConversations, searchValue]);

  function scrollToLatest() {
    const element = messageScrollRef.current;
    if (!element) {
      return;
    }

    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
    setShowScrollToLatest(false);
  }

  async function handleSelectConversation(conversationId: string) {
    if (conversationId === activeConversationId) {
      return;
    }

    try {
      await loadConversation(conversationId);
      if (isMobile) {
        setMobileSidebarOpen(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load conversation";
      setBanner(message);
      window.setTimeout(() => setBanner(null), 2200);
    }
  }

  async function handleNewChat() {
    try {
      const created = await createConversation({
        defaultAgentId: isAdminWorkspace ? selectedAgentId : "global",
        autoRouteEnabled: isAdminWorkspace ? autoRoute : true,
        title: "New chat",
      }, requestContextHeaders);

      setConversations((current) => [toListItem(created), ...current]);
      await loadConversation(created.id);
      setTrace(null);
      setDraft("");

      if (isMobile) {
        setMobileSidebarOpen(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create conversation";
      setBanner(message);
      window.setTimeout(() => setBanner(null), 2200);
    }
  }

  async function patchActiveConversation(patch: {
    title?: string;
    autoRouteEnabled?: boolean;
    defaultAgentId?: AgentId;
    status?: "active" | "archived";
    isPinned?: boolean;
  }) {
    if (!activeConversationId) {
      return;
    }

    const updated = await patchConversation(activeConversationId, patch, requestContextHeaders);
    setActiveConversation(updated);
    setConversations((current) =>
      current.map((conversation) => (conversation.id === updated.id ? { ...conversation, ...updated } : conversation))
    );
    return updated;
  }

  async function handleToggleAutoRoute() {
    if (!isAdminWorkspace || !activeConversation) {
      return;
    }

    const nextValue = !autoRoute;
    setAutoRoute(nextValue);
    try {
      await patchActiveConversation({ autoRouteEnabled: nextValue });
    } catch {
      setAutoRoute(activeConversation.autoRouteEnabled);
    }
  }

  async function handleSelectAgent(agentId: AgentId) {
    if (!isAdminWorkspace || !activeConversation) {
      return;
    }

    setSelectedAgentId(agentId);
    setRecentAgentIds((current) => [agentId, ...current.filter((id) => id !== agentId)].slice(0, 4));
    try {
      await patchActiveConversation({ defaultAgentId: agentId });
    } catch {
      setSelectedAgentId(activeConversation.defaultAgentId);
    }
  }

  async function handleArchiveConversation(conversationId: string) {
    try {
      await patchConversation(conversationId, { status: "archived" }, requestContextHeaders);
      await refreshConversations(searchValue, false);

      if (conversationId === activeConversationId) {
        const nextId = conversations.find((conversation) => conversation.id !== conversationId)?.id;
        if (nextId) {
          await loadConversation(nextId);
        } else {
          await handleNewChat();
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Archive failed";
      setBanner(message);
      window.setTimeout(() => setBanner(null), 1800);
    }
  }

  async function handleDeleteConversation(conversationId: string) {
    const isActiveConversation = conversationId === activeConversationId;
    const target = conversations.find((conversation) => conversation.id === conversationId);
    const confirmed = window.confirm(`Delete "${target?.title ?? "this conversation"}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteConversation(conversationId, requestContextHeaders);
      const remaining = await refreshConversations(searchValue, false);

      if (isActiveConversation) {
        const nextId = remaining.find((conversation) => conversation.id !== conversationId)?.id;
        if (nextId) {
          await loadConversation(nextId);
        } else {
          await handleNewChat();
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";
      setBanner(message);
      window.setTimeout(() => setBanner(null), 1800);
    }
  }

  async function handleTogglePin(conversationId: string, nextPinned: boolean) {
    try {
      await patchConversation(conversationId, { isPinned: nextPinned }, requestContextHeaders);
      await refreshConversations(searchValue, false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update pin state";
      setBanner(message);
      window.setTimeout(() => setBanner(null), 1800);
    }
  }

  async function sendPrompt(payload: { content: string; attachments: AttachmentMetadata[] }) {
    if (!activeConversationId || isStreaming) {
      return;
    }

    const rawPrompt = payload.content.trim();
    if (!rawPrompt) {
      return;
    }

    const selectedAgent = isAdminWorkspace ? selectedAgentId : "global";
    const nextAutoRoute = isAdminWorkspace ? autoRoute : true;
    const nowIso = new Date().toISOString();

    const optimisticUser: RenderMessage = {
      id: createId("tmp_user"),
      conversationId: activeConversationId,
      role: "user",
      contentText: rawPrompt,
      contentBlocks: [],
      createdAt: nowIso,
      agentId: selectedAgent,
      parentMessageId: null,
      attachments: payload.attachments,
      status: "complete",
    };

    const optimisticAssistant: RenderMessage = {
      id: createId("tmp_assistant"),
      conversationId: activeConversationId,
      role: "assistant",
      contentText: "",
      contentBlocks: [],
      createdAt: nowIso,
      agentId: selectedAgent,
      parentMessageId: optimisticUser.id,
      attachments: [],
      status: "streaming",
    };

    setMessages((current) => [...current, optimisticUser, optimisticAssistant]);
    setIsStreaming(true);

    try {
      const response = await postMessage(activeConversationId, {
        content: rawPrompt,
        selectedAgentId: selectedAgent,
        autoRouteEnabled: nextAutoRoute,
        attachments: payload.attachments,
      }, requestContextHeaders);

      const result = response.data;
      setMessages((current) => [
        ...current.filter((message) => message.id !== optimisticUser.id && message.id !== optimisticAssistant.id),
        { ...result.userMessage, status: "complete" as const },
        { ...result.assistantMessage, status: "complete" as const },
      ]);
      setTrace(result.traceEvent);

      if (result.conversation) {
        setActiveConversation(result.conversation);
      }

      await refreshConversations(searchValue, false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Message request failed";
      setMessages((current) =>
        current.map((item) =>
          item.id === optimisticAssistant.id
            ? {
                ...item,
                contentText: message,
                status: "complete",
              }
            : item
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }

  async function handleSendMessage(payload: { content: string; attachments: AttachmentMetadata[] }) {
    await sendPrompt(payload);
  }

  function handleMentionAgent(agentId: AgentId) {
    if (!isAdminWorkspace) {
      return;
    }

    void handleSelectAgent(agentId);
  }

  const sidebarWidth = isMobile
    ? mobileSidebarOpen
      ? uiTokens.layout.sidebarExpanded
      : 0
    : sidebarCollapsed
      ? uiTokens.layout.sidebarCollapsed
      : uiTokens.layout.sidebarExpanded;

  return (
    <div className={cn(theme === "dark" ? "dark" : "", "h-screen w-full")}>
      <div className="relative flex h-full overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <AnimatePresence>
          {isMobile && mobileSidebarOpen && (
            <motion.button
              type="button"
              aria-label="Close sidebar overlay"
              className="absolute inset-0 z-20 bg-slate-900/25 backdrop-blur-sm dark:bg-slate-950/65"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: uiTokens.motion.duration.base, ease: uiTokens.motion.ease.easeOut }}
              onClick={() => setMobileSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        <motion.aside
          className={cn(
            "z-30 shrink-0 overflow-hidden border-r border-slate-200 bg-slate-50/90 dark:border-slate-800/80 dark:bg-slate-950",
            isMobile && "absolute inset-y-0 left-0",
            isMobile && !mobileSidebarOpen && "pointer-events-none"
          )}
          animate={{ width: sidebarWidth }}
          transition={{ duration: uiTokens.motion.duration.slow, ease: uiTokens.motion.ease.easeInOut }}
        >
          <Sidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            workspaceMode={workspaceMode}
            collapsed={!isMobile && sidebarCollapsed}
            mobile={isMobile}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onNewChat={handleNewChat}
            onSelectConversation={handleSelectConversation}
            onTogglePin={handleTogglePin}
            onArchiveConversation={handleArchiveConversation}
            onDeleteConversation={handleDeleteConversation}
            onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />
        </motion.aside>

        <div className="flex min-w-0 flex-1 flex-col bg-slate-100 dark:bg-slate-950">
          <TopBar
            agents={agents}
            selectedAgentId={selectedAgentId}
            recentAgentIds={recentAgentIds}
            autoRoute={autoRoute}
            traceOpen={traceOpen}
            workspaceMode={workspaceMode}
            canViewTrace={isAdminWorkspace}
            showAgentPicker={isAdminWorkspace}
            canToggleAutoRoute={isAdminWorkspace}
            theme={theme}
            onSelectAgent={handleSelectAgent}
            onToggleAutoRoute={handleToggleAutoRoute}
            onToggleTrace={() => setTraceOpen((value) => !value)}
            onToggleTheme={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
            onToggleSidebar={() => {
              if (isMobile) {
                setMobileSidebarOpen((value) => !value);
              } else {
                setSidebarCollapsed((value) => !value);
              }
            }}
          />

          <main className="mx-auto flex min-h-0 w-full max-w-[1550px] flex-1 overflow-hidden" aria-label="Chat workspace">
            <section
              className={cn(
                "relative flex min-w-0 flex-1 flex-col",
                isAdminWorkspace && "border-r border-slate-200 dark:border-slate-900/20"
              )}
            >
              <div ref={messageScrollRef} className="scrollbar-thin flex-1 overflow-y-auto px-4 py-5 md:px-8">
                <div className={cn("mx-auto flex w-full flex-col", uiTokens.layout.chatMax)}>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <StatusBadge
                      label={isAdminWorkspace ? "Admin workspace" : "User workspace"}
                      tone={isAdminWorkspace ? "warning" : "neutral"}
                      className="normal-case tracking-normal"
                    />
                    <StatusBadge label={selectedAgent.name} tone="info" className="normal-case tracking-normal" />
                    <StatusBadge
                      label={autoRoute ? "Auto-route active" : "Manual route"}
                      tone={autoRoute ? "success" : "neutral"}
                      className="normal-case tracking-normal"
                    />
                  </div>

                  {isBootstrapping ? (
                    <div className="rounded-[16px] border border-slate-300 bg-white/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                      Loading conversations...
                    </div>
                  ) : messages.length === 0 ? (
                    <EmptyState agentName={selectedAgent.name} />
                  ) : (
                    <AnimatePresence initial={false}>
                      {messages.map((message, index) => {
                        const previous = messages[index - 1];
                        const next = messages[index + 1];
                        const sameAsPrevious =
                          !!previous &&
                          previous.role === message.role &&
                          (message.role !== "assistant" || previous.agentId === message.agentId);
                        const sameAsNext =
                          !!next &&
                          next.role === message.role &&
                          (message.role !== "assistant" || next.agentId === message.agentId);

                        return (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            isFirstInGroup={!sameAsPrevious}
                            isLastInGroup={!sameAsNext}
                          />
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {showScrollToLatest && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: uiTokens.motion.duration.base, ease: uiTokens.motion.ease.easeOut }}
                    onClick={scrollToLatest}
                    className="absolute bottom-28 right-5 z-10 flex items-center gap-1.5 rounded-[16px] border border-slate-300 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200"
                    aria-label="Scroll to latest message"
                  >
                    <ArrowDown size={uiTokens.icon.sm} />
                    Latest
                  </motion.button>
                )}
              </AnimatePresence>

              <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-slate-100/95 px-4 pb-3 pt-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 md:px-6">
                <div className={cn("mx-auto w-full", uiTokens.layout.chatMax)}>
                  <AnimatePresence>
                    {banner && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: uiTokens.motion.duration.fast, ease: uiTokens.motion.ease.easeOut }}
                        className="mb-2 rounded-[14px] border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-700 dark:border-sky-500/35 dark:bg-sky-500/10 dark:text-sky-200"
                      >
                        {banner}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Composer
                    placeholder={selectedAgent.placeholder}
                    agentName={selectedAgent.name}
                    autoRoute={autoRoute}
                    draft={draft}
                    mentionAgents={isAdminWorkspace ? agents.map((agent) => ({ id: agent.id, label: agent.id.toUpperCase() })) : []}
                    disabled={isStreaming || !activeConversationId}
                    onDraftChange={setDraft}
                    onSubmit={handleSendMessage}
                    onMentionAgent={handleMentionAgent}
                  />
                </div>
              </div>

              {isAdminWorkspace && (
                <div className="border-t border-slate-200 bg-slate-100/95 p-3 dark:border-slate-800 dark:bg-slate-950/95 lg:hidden">
                  <TracePanel trace={trace} isOpen={traceOpen} onToggle={() => setTraceOpen((value) => !value)} compact />
                </div>
              )}
            </section>

            {isAdminWorkspace && (
              <motion.aside
                className="hidden lg:block"
                animate={{ width: traceOpen ? uiTokens.layout.traceExpanded : uiTokens.layout.traceCollapsed }}
                transition={{ duration: uiTokens.motion.duration.slow, ease: uiTokens.motion.ease.easeInOut }}
              >
                <TracePanel trace={trace} isOpen={traceOpen} onToggle={() => setTraceOpen((value) => !value)} />
              </motion.aside>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  agentName: string;
}

function EmptyState({ agentName }: EmptyStateProps) {
  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center rounded-[18px] border border-dashed border-slate-300 bg-white/70 px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-900/70">
      <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        <BriefcaseBusiness size={20} />
      </div>
      <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">Start a conversation</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
        {agentName} is ready. Send your first request and the platform will persist timeline, trace, and context memory.
      </p>
    </div>
  );
}
