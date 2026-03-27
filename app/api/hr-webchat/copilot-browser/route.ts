import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  const modulePath = path.join(
    process.cwd(),
    "node_modules",
    "@microsoft",
    "agents-copilotstudio-client",
    "dist",
    "src",
    "browser.mjs"
  );
  const contents = await readFile(modulePath, "utf8");

  return new Response(contents, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
