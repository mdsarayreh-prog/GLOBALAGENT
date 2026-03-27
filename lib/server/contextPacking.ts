import { serverConfig } from "@/lib/server/config";
import { ContextBuildLog, ConversationContextState, ConversationMessage, PinnedFact } from "@/types/conversation";

function clampText(value: string, maxChars: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxChars - 3)}...`;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function makeFactId(prefix: string, sourceMessageId: string, index: number): string {
  return `${prefix}_${sourceMessageId}_${index}`;
}

function extractDecisionFacts(messageId: string, createdAt: string, text: string): PinnedFact[] {
  const facts: PinnedFact[] = [];
  const sentences = splitSentences(text);
  const keywords = ["decision", "decide", "approved", "agreed", "we will", "will proceed", "must"];

  sentences.forEach((sentence, index) => {
    const lower = sentence.toLowerCase();
    if (!keywords.some((keyword) => lower.includes(keyword))) {
      return;
    }

    facts.push({
      id: makeFactId("decision", messageId, index),
      kind: "decision",
      value: clampText(sentence, 280),
      sourceMessageId: messageId,
      createdAt,
    });
  });

  return facts;
}

function extractIdentifierFacts(messageId: string, createdAt: string, text: string): PinnedFact[] {
  const facts: PinnedFact[] = [];
  const ids = new Set<string>();
  const regex = /\b([A-Z]{2,}-\d{2,}|\d{6,}|REQ-\d{2,}|INC-\d{2,})\b/g;

  for (const match of text.matchAll(regex)) {
    const value = match[1]?.trim();
    if (!value || ids.has(value)) {
      continue;
    }

    ids.add(value);
    facts.push({
      id: makeFactId("identifier", messageId, ids.size),
      kind: "identifier",
      value,
      sourceMessageId: messageId,
      createdAt,
    });
  }

  return facts;
}

function extractPreferenceFacts(messageId: string, createdAt: string, text: string): PinnedFact[] {
  const facts: PinnedFact[] = [];
  const sentences = splitSentences(text);
  const keywords = ["prefer", "preference", "avoid", "always", "never", "priority"];

  sentences.forEach((sentence, index) => {
    const lower = sentence.toLowerCase();
    if (!keywords.some((keyword) => lower.includes(keyword))) {
      return;
    }

    facts.push({
      id: makeFactId("preference", messageId, index),
      kind: "preference",
      value: clampText(sentence, 280),
      sourceMessageId: messageId,
      createdAt,
    });
  });

  return facts;
}

function dedupeFacts(facts: PinnedFact[]): PinnedFact[] {
  const seen = new Set<string>();
  const deduped: PinnedFact[] = [];

  for (const fact of facts) {
    const key = `${fact.kind}:${fact.value.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(fact);
  }

  return deduped;
}

export function buildPackedContext(args: {
  summary: string;
  pinnedFacts: PinnedFact[];
  recentMessages: ConversationMessage[];
  userPrompt: string;
}): ContextBuildLog {
  const recentLines = args.recentMessages.map((message) => {
    const roleLabel = message.role === "assistant" && message.agentId ? `assistant:${message.agentId}` : message.role;
    return `${roleLabel}: ${message.contentText}`;
  });

  const summaryBlock = args.summary.trim() ? args.summary.trim() : "No summary available yet.";
  const factsBlock =
    args.pinnedFacts.length > 0
      ? args.pinnedFacts.map((fact) => `- [${fact.kind}] ${fact.value}`).join("\n")
      : "- None extracted yet.";

  let packed = [
    "Conversation Summary:",
    summaryBlock,
    "",
    "Pinned Facts:",
    factsBlock,
    "",
    "Recent Messages:",
    recentLines.length > 0 ? recentLines.join("\n") : "No prior messages.",
    "",
    `Current User Message: ${args.userPrompt}`,
  ].join("\n");

  let truncated = false;
  if (packed.length > serverConfig.contextMaxChars) {
    truncated = true;
    packed = packed.slice(packed.length - serverConfig.contextMaxChars);
  }

  return {
    packedPrompt: packed,
    recentMessagesUsed: args.recentMessages.length,
    summaryChars: summaryBlock.length,
    pinnedFactsUsed: args.pinnedFacts.length,
    truncated,
  };
}

function summarizeTurn(previousSummary: string, userText: string, assistantText: string, assistantAgent: string | null): string {
  const snippets = previousSummary.trim() ? [previousSummary.trim()] : [];
  snippets.push(`User asked: ${clampText(userText, 220)}`);
  snippets.push(`Assistant${assistantAgent ? ` (${assistantAgent})` : ""}: ${clampText(assistantText, 260)}`);
  const merged = snippets.join("\n");

  if (merged.length <= serverConfig.summaryMaxChars) {
    return merged;
  }

  return merged.slice(merged.length - serverConfig.summaryMaxChars);
}

export function updateContextState(args: {
  current: ConversationContextState | null;
  userMessage: ConversationMessage;
  assistantMessage: ConversationMessage;
}): ConversationContextState {
  const existingFacts = args.current?.pinnedFacts ?? [];
  const extractedFacts = [
    ...extractDecisionFacts(args.userMessage.id, args.userMessage.createdAt, args.userMessage.contentText),
    ...extractDecisionFacts(args.assistantMessage.id, args.assistantMessage.createdAt, args.assistantMessage.contentText),
    ...extractIdentifierFacts(args.userMessage.id, args.userMessage.createdAt, args.userMessage.contentText),
    ...extractIdentifierFacts(args.assistantMessage.id, args.assistantMessage.createdAt, args.assistantMessage.contentText),
    ...extractPreferenceFacts(args.userMessage.id, args.userMessage.createdAt, args.userMessage.contentText),
    ...extractPreferenceFacts(args.assistantMessage.id, args.assistantMessage.createdAt, args.assistantMessage.contentText),
  ];

  const pinnedFacts = dedupeFacts([...existingFacts, ...extractedFacts]).slice(-serverConfig.pinnedFactsLimit);
  const summary = summarizeTurn(
    args.current?.summary ?? "",
    args.userMessage.contentText,
    args.assistantMessage.contentText,
    args.assistantMessage.agentId
  );

  return {
    conversationId: args.userMessage.conversationId,
    summary,
    pinnedFacts,
    updatedAt: new Date().toISOString(),
  };
}
