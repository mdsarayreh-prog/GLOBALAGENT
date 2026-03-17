import { buildAssistantReply } from "@/lib/utils";
import { splitIntoChunks } from "@/lib/mockStream";
import { AgentId } from "@/types/chat";

const VALID_AGENT_IDS: AgentId[] = ["global", "hr", "it", "ops", "supply", "academy"];

function normalizeAgentId(value: unknown): AgentId {
  if (typeof value !== "string") {
    return "global";
  }

  return (VALID_AGENT_IDS.find((agentId) => agentId === value) ?? "global") as AgentId;
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    prompt?: string;
    agentId?: string;
  };

  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const agentId = normalizeAgentId(body.agentId);
  const reply = buildAssistantReply(agentId, prompt || "Provide guidance.");
  const chunks = splitIntoChunks(reply, 5, 12);

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
          setTimeout(push, 35);
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