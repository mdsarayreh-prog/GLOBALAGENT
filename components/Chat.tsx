"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, BriefcaseBusiness, Layers3 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Composer } from "@/components/Composer";
import { MessageBubble } from "@/components/MessageBubble";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { TracePanel } from "@/components/TracePanel";
import { WorkflowPanel } from "@/components/WorkflowPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getAgentById, getEnabledAgents } from "@/lib/agents";
import { streamAssistantResponse } from "@/lib/chatTransport";
import { resolveRoute, stripAgentMentions } from "@/lib/routing";
import { uiTokens } from "@/lib/ui-tokens";
import {
  buildAssistantReply,
  cn,
  createId,
  createNewThread,
  createUserMessage,
  getThreadTitleFromText,
} from "@/lib/utils";
import { AgentId, Message, MessageMetadata, RouteDecision, Thread } from "@/types/chat";

interface SendOptions {
  overrideAgentId?: AgentId;
  forceAutoRoute?: boolean;
}

interface ChatProps {
  initialThreads: Thread[];
  workspaceMode: "user" | "admin";
}

export function Chat({ initialThreads, workspaceMode }: ChatProps) {
  const isAdminWorkspace = workspaceMode === "admin";
  const defaultAgentId: AgentId = isAdminWorkspace ? (initialThreads[0]?.agentId ?? "global") : "global";
  const agents = useMemo(() => getEnabledAgents(), []);
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState<string>(initialThreads[0]?.id ?? "");
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId>(defaultAgentId);
  const [recentAgentIds, setRecentAgentIds] = useState<AgentId[]>([defaultAgentId]);
  const [autoRoute, setAutoRoute] = useState(true);
  const [trace, setTrace] = useState<RouteDecision | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isStreaming, setIsStreaming] = useState(false);
  const [traceOpen, setTraceOpen] = useState(workspaceMode === "admin");
  const [workflowOpen, setWorkflowOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const messageScrollRef = useRef<HTMLDivElement | null>(null);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? threads[0],
    [threads, activeThreadId]
  );

  const selectedAgent = getAgentById(selectedAgentId);
  const sidebarAgents = isAdminWorkspace ? agents : agents.filter((agent) => agent.id === "global");

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
  }, [activeThreadId]);

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
  }, [activeThread?.messages, isStreaming]);

  function patchThread(threadId: string, updater: (thread: Thread) => Thread) {
    setThreads((current) => current.map((thread) => (thread.id === threadId ? updater(thread) : thread)));
  }

  function registerRecentAgent(agentId: AgentId) {
    setRecentAgentIds((current) => [agentId, ...current.filter((id) => id !== agentId)].slice(0, 4));
  }

  function scrollToLatest() {
    const element = messageScrollRef.current;
    if (!element) {
      return;
    }

    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
    setShowScrollToLatest(false);
  }

  function handleSelectThread(threadId: string) {
    const nextThread = threads.find((thread) => thread.id === threadId);
    setActiveThreadId(threadId);

    if (nextThread) {
      const nextAgentId = isAdminWorkspace ? nextThread.agentId : "global";
      setSelectedAgentId(nextAgentId);
      registerRecentAgent(nextAgentId);
    }

    if (isMobile) {
      setMobileSidebarOpen(false);
    }
  }

  function handleSelectAgent(agentId: AgentId) {
    if (!isAdminWorkspace) {
      return;
    }

    setSelectedAgentId(agentId);
    registerRecentAgent(agentId);

    if (!activeThread) {
      return;
    }

    patchThread(activeThread.id, (thread) => {
      const agent = getAgentById(agentId);
      const hasUserMessages = thread.messages.some((message) => message.role === "user");
      const hasOnlyGreeting = thread.messages.length === 1 && thread.messages[0]?.role === "assistant";

      if (!hasUserMessages && hasOnlyGreeting) {
        return {
          ...thread,
          agentId,
          title: `${agent.name} thread`,
          messages: [
            {
              ...thread.messages[0],
              content: agent.greeting,
              agentId,
            },
          ],
        };
      }

      return {
        ...thread,
        agentId,
      };
    });
  }

  function handleNewChat() {
    const nextAgentId = isAdminWorkspace ? selectedAgentId : "global";
    const newThread = createNewThread(nextAgentId);
    setThreads((current) => [newThread, ...current]);
    setActiveThreadId(newThread.id);
    setTrace(null);
    setDraft("");
    registerRecentAgent(nextAgentId);

    if (isMobile) {
      setMobileSidebarOpen(false);
    }
  }

  async function sendPrompt(content: string, options: SendOptions = {}) {
    if (!activeThread || isStreaming) {
      return;
    }

    const rawPrompt = content.trim();
    if (!rawPrompt) {
      return;
    }

    const routingSelectedAgent = isAdminWorkspace ? (options.overrideAgentId ?? selectedAgentId) : "global";
    const routingAutoMode = isAdminWorkspace ? (options.forceAutoRoute ?? autoRoute) : true;
    const cleanPrompt = stripAgentMentions(rawPrompt) || rawPrompt;

    const decision = resolveRoute({
      input: isAdminWorkspace ? rawPrompt : cleanPrompt,
      selectedAgentId: routingSelectedAgent,
      autoRoute: routingAutoMode,
    });

    const routeLabel =
      decision.decisionType === "delegated"
        ? `Routed to ${getAgentById(decision.resolvedAgentId).name}`
        : decision.decisionType === "mention"
          ? `Directed to ${getAgentById(decision.resolvedAgentId).name}`
          : `Answered by ${getAgentById(decision.resolvedAgentId).name}`;

    const threadId = activeThread.id;
    setTrace(decision);
    registerRecentAgent(decision.resolvedAgentId);

    const userMessage = createUserMessage(routingSelectedAgent, rawPrompt);

    const assistantMetadata: MessageMetadata = {
      routingLabel: routeLabel,
      routingMode: decision.decisionType,
      confidence: decision.confidence,
      sources: decision.sourcesUsed,
      toolsCalled: decision.toolsCalled,
      approvedSources: true,
      canRetry: true,
      canReroute: true,
      previousUserPrompt: rawPrompt,
    };

    const assistantMessage: Message = {
      id: createId("msg"),
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      agentId: decision.resolvedAgentId,
      status: "streaming",
      metadata: assistantMetadata,
    };

    patchThread(threadId, (thread) => {
      const hasUserMessage = thread.messages.some((message) => message.role === "user");
      const nextTitle = hasUserMessage ? thread.title : getThreadTitleFromText(cleanPrompt);

      return {
        ...thread,
        title: nextTitle,
        messages: [...thread.messages, userMessage, assistantMessage],
      };
    });

    setIsStreaming(true);

    const reply = buildAssistantReply(decision.resolvedAgentId, cleanPrompt);

    try {
      await streamAssistantResponse({
        agentId: decision.resolvedAgentId,
        prompt: cleanPrompt,
        mockResponse: reply,
        onToken: (token) => {
          patchThread(threadId, (thread) => ({
            ...thread,
            messages: thread.messages.map((message) =>
              message.id === assistantMessage.id
                ? {
                    ...message,
                    content: message.content + token,
                  }
                : message
            ),
          }));
        },
      });
    } catch {
      setTrace((current) =>
        current
          ? {
              ...current,
              fallbackState: "stream_error",
              error: "Response stream interrupted. Retry or reroute is available.",
            }
          : current
      );

      patchThread(threadId, (thread) => ({
        ...thread,
        messages: thread.messages.map((message) =>
          message.id === assistantMessage.id
            ? {
                ...message,
                content: "Response stream interrupted. Retry or reroute this request.",
                status: "complete",
                metadata: {
                  ...message.metadata,
                  error: "Response stream interrupted.",
                },
              }
            : message
        ),
      }));
    } finally {
      patchThread(threadId, (thread) => ({
        ...thread,
        messages: thread.messages.map((message) =>
          message.id === assistantMessage.id
            ? {
                ...message,
                status: "complete",
              }
            : message
        ),
      }));

      setIsStreaming(false);
    }
  }

  async function handleSendMessage(content: string) {
    await sendPrompt(content);
  }

  function handleAttach() {
    setBanner("Attachment intake is enabled as a mock in v1. Connect document ingestion in backend phase.");
    window.setTimeout(() => setBanner(null), 2000);
  }

  async function handleCopyMessage(message: Message) {
    if (!message.content) {
      return;
    }

    try {
      await navigator.clipboard.writeText(message.content);
      setBanner("Response copied to clipboard.");
    } catch {
      setBanner("Copy failed in this browser context.");
    }
    window.setTimeout(() => setBanner(null), 1400);
  }

  async function handleRetryMessage(message: Message) {
    const prompt = message.metadata?.previousUserPrompt;
    if (!prompt) {
      return;
    }

    await sendPrompt(prompt);
  }

  async function handleRerouteMessage(message: Message) {
    const prompt = message.metadata?.previousUserPrompt;
    if (!prompt) {
      return;
    }

    setSelectedAgentId("global");
    registerRecentAgent("global");
    await sendPrompt(prompt, { overrideAgentId: "global", forceAutoRoute: true });
  }

  function handleWorkflowTemplate(prompt: string, suggestedAgentId?: AgentId) {
    if (isAdminWorkspace && suggestedAgentId && suggestedAgentId !== selectedAgentId) {
      handleSelectAgent(suggestedAgentId);
    }

    setDraft(prompt);
  }

  function handleMentionAgent(agentId: AgentId) {
    if (!isAdminWorkspace) {
      return;
    }

    setSelectedAgentId(agentId);
    registerRecentAgent(agentId);
  }

  const sidebarWidth = isMobile
    ? mobileSidebarOpen
      ? uiTokens.layout.sidebarExpanded
      : 0
    : sidebarCollapsed
      ? uiTokens.layout.sidebarCollapsed
      : uiTokens.layout.sidebarExpanded;

  const messages = activeThread?.messages ?? [];

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
            agents={sidebarAgents}
            threads={threads}
            activeThreadId={activeThread?.id ?? ""}
            selectedAgentId={selectedAgentId}
            workspaceMode={workspaceMode}
            showAgentSelection={isAdminWorkspace}
            collapsed={!isMobile && sidebarCollapsed}
            mobile={isMobile}
            onNewChat={handleNewChat}
            onSelectThread={handleSelectThread}
            onSelectAgent={handleSelectAgent}
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
            onToggleAutoRoute={() => {
              if (isAdminWorkspace) {
                setAutoRoute((value) => !value);
              }
            }}
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
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
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
                    <button
                      type="button"
                      onClick={() => setWorkflowOpen((value) => !value)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200"
                    >
                      <Layers3 size={13} />
                      {workflowOpen ? "Hide workflows" : "Show workflows"}
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {workflowOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: uiTokens.motion.duration.base, ease: uiTokens.motion.ease.easeOut }}
                      >
                        <WorkflowPanel selectedAgentId={selectedAgentId} onUseTemplate={handleWorkflowTemplate} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {messages.length === 0 ? (
                    <EmptyState agentName={selectedAgent.name} />
                  ) : (
                    <AnimatePresence initial={false}>
                      {messages.map((message, index) => {
                        const previous = messages[index - 1];
                        const next = messages[index + 1];
                        const sameAsPrevious =
                          !!previous &&
                          previous.role === message.role &&
                          (message.role === "user" || previous.agentId === message.agentId);
                        const sameAsNext =
                          !!next &&
                          next.role === message.role &&
                          (message.role === "user" || next.agentId === message.agentId);

                        return (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            isFirstInGroup={!sameAsPrevious}
                            isLastInGroup={!sameAsNext}
                            onCopy={handleCopyMessage}
                            onRetry={handleRetryMessage}
                            onReroute={handleRerouteMessage}
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
                    disabled={isStreaming}
                    onDraftChange={setDraft}
                    onSubmit={handleSendMessage}
                    onAttach={handleAttach}
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
      <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">Launch an enterprise workflow</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
        {agentName} is ready. Define the objective, constraints, and expected outcome to receive governed execution guidance.
      </p>
    </div>
  );
}

