import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * 画像の保存先。
 * - BLOB_READ_WRITE_TOKEN があれば Vercel Blob（本番）
 * - なければ手元の .data/uploads に保存し、/media/... で表示（開発用）
 */
export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

const localRoot = () => path.join(process.cwd(), ".data", "uploads");

export async function saveImage(file: File, folder: string): Promise<string> {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new Error("JPEG・PNG・WebP・GIF の画像を選んでください");
  if (file.size > IMAGE_MAX_BYTES) throw new Error("画像は10MBまでです");
  const name = `${folder}/${randomUUID()}.${ext}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`orbit/${name}`, file, { access: "public", contentType: file.type });
    return blob.url;
  }
  const full = path.join(localRoot(), name);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, Buffer.from(await file.arrayBuffer()));
  return `/media/${name}`;
}

export async function removeImage(url: string) {
  try {
    if (url.startsWith("/media/")) {
      await unlink(safeLocalPath(url.slice("/media/".length)));
    } else if (process.env.BLOB_READ_WRITE_TOKEN && url.includes(".blob.vercel-storage.com")) {
      const { del } = await import("@vercel/blob");
      await del(url);
    }
  } catch {
    // 消せなくても保存処理は止めない
  }
}

export function safeLocalPath(rel: string) {
  const root = localRoot();
  const full = path.join(root, rel);
  if (!full.startsWith(root + path.sep)) throw new Error("invalid path");
  return full;
}

export async function readLocal(rel: string) {
  return readFile(safeLocalPath(rel));
}
