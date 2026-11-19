import { readLocal } from "@/lib/storage";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

// 手元に保存した画像を表示する（本番は Vercel Blob のURLを直接使う）
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const rel = (await ctx.params).path.join("/");
  const type = TYPES[rel.split(".").pop() ?? ""];
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const buf = await readLocal(rel);
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
