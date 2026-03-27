import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const brandDir = path.join(root, "assets", "brand");
const publicDir = path.join(root, "public");
const appDir = path.join(root, "app");
const masterCanvasSize = 1536;
const markSafeArea = 0.94;

const masterTarget = path.join(brandDir, "global-agent-mark.png");

const sourceCandidates = [
  path.join(root, "global agent logo.png"),
  path.join(root, "global-agent-logo.png"),
  masterTarget,
];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveSource() {
  for (const candidate of sourceCandidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `No source logo found. Expected one of:\n${sourceCandidates.map((item) => `- ${item}`).join("\n")}`
  );
}

function transparent() {
  return { r: 0, g: 0, b: 0, alpha: 0 };
}

async function renderPng(masterBuffer, size) {
  let image = sharp(masterBuffer).resize(size, size, {
    fit: "contain",
    background: transparent(),
  });

  if (size <= 64) {
    image = image.sharpen();
  }

  return image.png().toBuffer();
}

async function buildMasterMark(source) {
  const trimmed = await sharp(source).ensureAlpha().trim().png().toBuffer();
  const trimmedMeta = await sharp(trimmed).metadata();
  if (!trimmedMeta.width || !trimmedMeta.height) {
    throw new Error(`Unable to trim source logo: ${source}`);
  }

  const targetSize = Math.max(16, Math.round(masterCanvasSize * markSafeArea));
  const scaled = await sharp(trimmed)
    .resize(targetSize, targetSize, {
      fit: "contain",
      background: transparent(),
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: masterCanvasSize,
      height: masterCanvasSize,
      channels: 4,
      background: transparent(),
    },
  })
    .composite([{ input: scaled, gravity: "center" }])
    .png()
    .toBuffer();
}

function buildIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6 + 16 * count);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let offset = 6 + 16 * count;
  images.forEach((image, index) => {
    const entry = 6 + index * 16;
    header[entry] = image.size >= 256 ? 0 : image.size;
    header[entry + 1] = image.size >= 256 ? 0 : image.size;
    header[entry + 2] = 0;
    header[entry + 3] = 0;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.buffer.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.buffer.length;
  });

  return Buffer.concat([header, ...images.map((image) => image.buffer)]);
}

async function main() {
  await mkdir(brandDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });
  await mkdir(appDir, { recursive: true });

  const source = await resolveSource();
  const sourceMeta = await sharp(source).metadata();
  if (!sourceMeta.width || !sourceMeta.height) {
    throw new Error(`Unable to read dimensions for source logo: ${source}`);
  }

  const masterBuffer = await buildMasterMark(source);

  await writeFile(masterTarget, masterBuffer);

  const icon16 = await renderPng(masterBuffer, 16);
  const icon32 = await renderPng(masterBuffer, 32);
  const icon48 = await renderPng(masterBuffer, 48);
  const apple180 = await renderPng(masterBuffer, 180);
  const android192 = await renderPng(masterBuffer, 192);
  const android512 = await renderPng(masterBuffer, 512);

  const faviconIco = buildIco([
    { size: 16, buffer: icon16 },
    { size: 32, buffer: icon32 },
    { size: 48, buffer: icon48 },
  ]);

  await Promise.all([
    writeFile(path.join(publicDir, "favicon.ico"), faviconIco),
    writeFile(path.join(publicDir, "favicon-16x16.png"), icon16),
    writeFile(path.join(publicDir, "favicon-32x32.png"), icon32),
    writeFile(path.join(publicDir, "apple-touch-icon.png"), apple180),
    writeFile(path.join(publicDir, "android-chrome-192x192.png"), android192),
    writeFile(path.join(publicDir, "android-chrome-512x512.png"), android512),
    writeFile(path.join(appDir, "favicon.ico"), faviconIco),
    writeFile(path.join(appDir, "icon.png"), android512),
    writeFile(path.join(appDir, "apple-icon.png"), apple180),
  ]);

  const manifest = {
    name: "Global Agent",
    short_name: "Global Agent",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    theme_color: "#030b14",
    background_color: "#030b14",
    display: "standalone",
  };

  await writeFile(path.join(publicDir, "site.webmanifest"), JSON.stringify(manifest, null, 2));

  console.log(`Source: ${source}`);
  console.log(`Master mark: ${masterTarget} (${masterCanvasSize}x${masterCanvasSize})`);
  console.log(`Mark safe area: ${(markSafeArea * 100).toFixed(0)}%`);
  console.log("Generated favicon + platform icons + manifest.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
