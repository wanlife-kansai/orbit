"use server";
import { revalidatePath } from "next/cache";
import { deleteDxNews, listDxNews, postDxNews } from "@/lib/portals/dx";

export async function loadDxNews() {
  const r = await listDxNews();
  return r.ok ? { ok: true as const, items: r.data } : { ok: false as const, message: r.message };
}

/** reserve は "YYYY-MM-DDTHH:MM"（日本時間）。空なら今すぐ */
export async function sendDxNews(input: { title: string; content: string; reserve: string }) {
  const title = input.title.trim().slice(0, 100);
  const content = input.content.trim().slice(0, 5000);
  if (!title) return { ok: false, message: "タイトルを入力してください" };
  let reserveAt: { y: number; m: number; d: number; h: number; mi: number } | undefined;
  if (input.reserve) {
    const m = input.reserve.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!m) return { ok: false, message: "予約日時が正しくありません" };
    reserveAt = { y: +m[1], m: +m[2], d: +m[3], h: +m[4], mi: +m[5] };
    const t = Date.UTC(reserveAt.y, reserveAt.m - 1, reserveAt.d, reserveAt.h - 9, reserveAt.mi);
    if (t < Date.now() + 5 * 60_000) return { ok: false, message: "予約は今から5分以上あとの日時にしてください" };
    if (reserveAt.y > new Date().getFullYear() + 5) return { ok: false, message: "予約は5年以内にしてください" };
  }
  const r = await postDxNews({ title, content, reserveAt });
  revalidatePath("/logs");
  return { ok: r.ok, message: r.ok ? "風俗DXに登録しました" : r.message };
}

export async function removeDxNews(id: string, title: string) {
  const r = await deleteDxNews(id, title);
  revalidatePath("/logs");
  return { ok: r.ok, message: r.ok ? "削除しました" : r.message };
}
