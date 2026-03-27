import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  const scriptPath = path.join(process.cwd(), "node_modules", "botframework-webchat", "dist", "webchat.js");
  const contents = await readFile(scriptPath, "utf8");

  return new Response(contents, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
