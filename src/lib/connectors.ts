import { catalogItem } from "./contentCatalog";
import { postDxNews } from "./portals/dx";
import type { ContentEntry } from "@/db/schema";

export type PostResult = { ok: boolean; message: string; kind?: string };

/** その枠に ORBIT から投稿できるか */
export function canPost(site: string, slot: string) {
  return !!catalogItem(site, slot)?.driver;
}

/** コンテンツ1件をサイトへ投稿する（ドライバーがない枠は「接続準備中」） */
export async function postContent(site: string, slot: string, entry: ContentEntry): Promise<PostResult> {
  const item = catalogItem(site, slot);
  if (!item?.driver) return { ok: false, message: "このサイトへの自動投稿は接続準備中です", kind: "未対応" };
  const title = entry.title.trim();
  if (!title) return { ok: false, message: "タイトルが空です", kind: "内容" };
  switch (item.driver) {
    case "fuzokudx.news": {
      const r = await postDxNews({ title: title.slice(0, 100), content: entry.body.slice(0, 5000) });
      return { ok: r.ok, message: r.ok ? "投稿しました" : r.message, kind: r.ok ? "" : "エラー" };
    }
    default:
      return { ok: false, message: "このサイトへの自動投稿は接続準備中です", kind: "未対応" };
  }
}
