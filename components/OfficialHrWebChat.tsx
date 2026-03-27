"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, RefreshCw } from "lucide-react";

type WebChatBootstrap = {
  token: string;
  directConnectUrl: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
};

type WebChatState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

type WebChatWindow = Window & {
  WebChat?: {
    createStyleSet: (styleOptions: Record<string, unknown>) => unknown;
    renderWebChat: (
      options: Record<string, unknown>,
      element: HTMLElement
    ) => void;
  };
};

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load script: ${src}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.loaded = "false";
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener("error", () => reject(new Error(`Failed to load script: ${src}`)), {
      once: true,
    });
    document.head.appendChild(script);
  });
}

export function OfficialHrWebChat() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const connectionRef = useRef<{ end?: () => void } | null>(null);
  const [state, setState] = useState<WebChatState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const hostElement = hostRef.current;

    async function bootstrap() {
      setState({ status: "loading" });

      try {
        const bootstrapResponse = await fetch("/api/hr-webchat", {
          method: "GET",
          cache: "no-store",
        });
        const bootstrapPayload = (await bootstrapResponse.json()) as Partial<WebChatBootstrap> & {
          error?: string;
        };

        if (!bootstrapResponse.ok || !bootstrapPayload.token || !bootstrapPayload.directConnectUrl) {
          throw new Error(bootstrapPayload.error ?? "Failed to initialize HR Copilot web chat.");
        }

        await loadScript("/api/hr-webchat/webchat-script");
        const browserModuleUrl = new URL("/api/hr-webchat/copilot-browser", window.location.origin).toString();
        const copilotModule = await import(/* webpackIgnore: true */ browserModuleUrl);
        const webChatWindow = window as WebChatWindow;

        if (!webChatWindow.WebChat) {
          throw new Error("Web Chat runtime did not load.");
        }

        if (cancelled || !hostElement) {
          return;
        }

        const { ConnectionSettings, CopilotStudioClient, CopilotStudioWebChat } = copilotModule;
        const settings = new ConnectionSettings({
          directConnectUrl: bootstrapPayload.directConnectUrl,
          enableDiagnostics: true,
        });
        const client = new CopilotStudioClient(settings, bootstrapPayload.token);
        const directLine = CopilotStudioWebChat.createConnection(client, {
          showTyping: true,
        });

        const styleSet = webChatWindow.WebChat.createStyleSet({
          hideUploadButton: true,
          sendBoxButtonColor: "#38bdf8",
          sendBoxButtonColorOnHover: "#7dd3fc",
          sendBoxBackground: "#0f172a",
          sendBoxBorderTop: "1px solid rgba(51, 65, 85, 0.9)",
          sendBoxTextColor: "#e2e8f0",
          backgroundColor: "#020617",
          bubbleBackground: "#172033",
          bubbleTextColor: "#f8fafc",
          bubbleBorderRadius: 18,
          bubbleFromUserBackground: "#0ea5e9",
          bubbleFromUserTextColor: "#f8fafc",
          bubbleFromUserBorderRadius: 18,
          botAvatarInitials: "HR",
          userAvatarInitials: "YU",
          accent: "#38bdf8",
          subtle: "#94a3b8",
          rootHeight: "100%",
          rootWidth: "100%",
        });

        webChatWindow.WebChat.renderWebChat(
          {
            directLine,
            styleSet,
            userID: bootstrapPayload.user?.id || "global-agent-user",
            username: bootstrapPayload.user?.name || "Global Agent User",
            locale: "en-US",
          },
          hostElement
        );

        connectionRef.current = directLine;
        setState({ status: "ready" });
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Failed to initialize HR Copilot web chat.";
          setState({ status: "error", message });
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
      connectionRef.current?.end?.();
      connectionRef.current = null;
      if (hostElement) {
        hostElement.innerHTML = "";
      }
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-slate-800/90 bg-slate-950/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white">Global Agent</h1>
            <p className="mt-1 text-sm text-slate-400">Official HR Copilot web integration</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <Link
              href="/logout"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
            >
              <LogOut size={16} />
              Logout
            </Link>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 px-6 py-6">
        <div className="mx-auto flex min-h-0 h-full w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950 shadow-[0_20px_70px_rgba(2,6,23,0.55)]">
          <div className="border-b border-slate-800 px-6 py-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 font-semibold text-sky-300">
                HR &amp; Policy Agent
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-300">
                Official Web Chat
              </span>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div ref={hostRef} className="absolute inset-0 h-full w-full" />

            {state.status === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/92">
                <div className="rounded-[22px] border border-slate-800 bg-slate-900 px-6 py-5 text-sm text-slate-300">
                  Initializing HR Copilot web chat...
                </div>
              </div>
            )}

            {state.status === "error" && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/92 px-6">
                <div className="max-w-2xl rounded-[22px] border border-rose-500/30 bg-rose-500/10 px-6 py-5 text-sm leading-7 text-rose-100">
                  <p className="font-semibold">HR Copilot web integration failed.</p>
                  <p className="mt-2">{state.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}
