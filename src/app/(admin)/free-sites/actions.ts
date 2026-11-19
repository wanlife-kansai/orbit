"use server";
import { revalidatePath } from "next/cache";
import { getSettings, patchSettings } from "@/lib/settings";
import { FREE_SITES } from "@/lib/freeSites";

export async function saveFreeSiteMemo(name: string, memo: string) {
  if (!FREE_SITES.some((s) => s.name === name)) return { ok: false };
  const memos = { ...(await getSettings()).freeSiteMemos };
  const v = memo.trim().slice(0, 500);
  if (v) memos[name] = v;
  else delete memos[name];
  await patchSettings({ freeSiteMemos: memos });
  revalidatePath("/free-sites");
  return { ok: true };
}
