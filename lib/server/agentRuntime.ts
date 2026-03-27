import { requestHrAgent } from "@/lib/server/hrCopilotClient";
import { AgentId } from "@/types/chat";

const HR_AGENT_ID: AgentId = "hr";

export interface AgentTurnResult {
  content: string;
  transport: "hr-live" | "error";
  errors: string[];
  fallbackState: string | null;
}

export async function executeAgentTurn(args: {
  resolvedAgentId: AgentId;
  userPrompt: string;
  packedContext: string;
  accessToken?: string;
}): Promise<AgentTurnResult> {
  if (args.resolvedAgentId !== HR_AGENT_ID) {
    return {
      content: "Only the HR Copilot agent is connected right now.",
      transport: "error",
      errors: ["Only the HR Copilot agent is connected right now."],
      fallbackState: "stream_error",
    };
  }

  const prompt = `${args.packedContext}\n\nRespond to the current user message.`;

  try {
    const content = await requestHrAgent(prompt, args.accessToken);
    return {
      content,
      transport: "hr-live",
      errors: [],
      fallbackState: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown HR integration error";

    return {
      content: `HR Copilot integration error: ${message}`,
      transport: "error",
      errors: [`Live HR call failed: ${message}`],
      fallbackState: "stream_error",
    };
  }
}
