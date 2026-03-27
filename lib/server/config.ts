function parseIntEnv(value: string | undefined, fallback: number, min: number, max: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

export const serverConfig = {
  contextRecentTurns: parseIntEnv(process.env.CONTEXT_RECENT_TURNS, 8, 2, 30),
  contextMaxChars: parseIntEnv(process.env.CONTEXT_MAX_CHARS, 6000, 1200, 20000),
  summaryMaxChars: parseIntEnv(process.env.CONTEXT_SUMMARY_MAX_CHARS, 2000, 400, 10000),
  pinnedFactsLimit: parseIntEnv(process.env.CONTEXT_PINNED_FACTS_LIMIT, 20, 5, 80),
  retentionDays: parseIntEnv(process.env.CONVERSATION_RETENTION_DAYS, 0, 0, 3650),
};
