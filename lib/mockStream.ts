interface StreamOptions {
  text: string;
  onToken: (value: string) => void;
  delayMs?: number;
  minChunk?: number;
  maxChunk?: number;
}

function randomChunkSize(minChunk: number, maxChunk: number): number {
  return Math.floor(Math.random() * (maxChunk - minChunk + 1)) + minChunk;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function splitIntoChunks(text: string, minChunk = 4, maxChunk = 11): string[] {
  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const size = randomChunkSize(minChunk, maxChunk);
    chunks.push(text.slice(cursor, cursor + size));
    cursor += size;
  }

  return chunks;
}

export async function streamMockText({
  text,
  onToken,
  delayMs = 35,
  minChunk = 4,
  maxChunk = 11,
}: StreamOptions): Promise<void> {
  const chunks = splitIntoChunks(text, minChunk, maxChunk);

  for (const chunk of chunks) {
    onToken(chunk);
    await wait(delayMs);
  }
}