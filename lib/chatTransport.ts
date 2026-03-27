import { streamMockText } from "@/lib/mockStream";
import { AgentId } from "@/types/chat";

export const CHAT_TRANSPORT_MODE: "mock" | "api" = "api";

interface StreamAssistantParams {
  agentId: AgentId;
  prompt: string;
  mockResponse: string;
  onToken: (chunk: string) => void;
}

async function streamFromApi({ agentId, prompt, onToken }: Omit<StreamAssistantParams, "mockResponse">) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ agentId, prompt }),
  });

  if (!response.ok || !response.body) {
    throw new Error("Chat API stream failed");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const event = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);

      if (event.startsWith("data:")) {
        const payload = event.slice(5).trim();
        if (payload === "[DONE]") {
          return;
        }

        const parsed = JSON.parse(payload) as { content?: string };
        if (parsed.content) {
          onToken(parsed.content);
        }
      }

      boundary = buffer.indexOf("\n\n");
    }
  }
}

export async function streamAssistantResponse({
  agentId,
  prompt,
  mockResponse,
  onToken,
}: StreamAssistantParams): Promise<void> {
  if (CHAT_TRANSPORT_MODE === "api") {
    await streamFromApi({ agentId, prompt, onToken });
    return;
  }

  await streamMockText({
    text: mockResponse,
    onToken,
    delayMs: 32,
  });
}
