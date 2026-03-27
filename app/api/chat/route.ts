import { splitIntoChunks } from "@/lib/mockStream";
import { requestHrAgent } from "@/lib/server/hrCopilotClient";
import { AgentId } from "@/types/chat";

const VALID_AGENT_IDS: AgentId[] = ["global", "hr", "it", "ops", "supply", "academy"];
const HR_AGENT_ID: AgentId = "hr";

function normalizeAgentId(value: unknown): AgentId {
  if (typeof value !== "string") {
    return "global";
  }

  return (VALID_AGENT_IDS.find((agentId) => agentId === value) ?? "global") as AgentId;
}

function normalizePrompt(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function resolveTargetAgent(agentId: AgentId): AgentId {
  return agentId === "global" ? HR_AGENT_ID : agentId;
}

function toSseStream(content: string): Response {
  const chunks = splitIntoChunks(content, 5, 12);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let index = 0;

      const push = () => {
        if (index < chunks.length) {
          const payload = JSON.stringify({
            type: "chunk",
            content: chunks[index],
          });

          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          index += 1;
          setTimeout(push, 30);
          return;
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      };

      push();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    prompt?: string;
    agentId?: string;
  };

  const prompt = normalizePrompt(body.prompt);
  const requestAgentId = normalizeAgentId(body.agentId);
  const resolvedAgentId = resolveTargetAgent(requestAgentId);

  if (!prompt) {
    return toSseStream("Please enter a message and try again.");
  }

  if (resolvedAgentId !== HR_AGENT_ID) {
    return toSseStream("Only the HR agent is connected right now. Please switch to Global or HR.");
  }

  try {
    const reply = await requestHrAgent(prompt);
    return toSseStream(reply);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return toSseStream(`HR agent integration error: ${message}`);
  }
}
