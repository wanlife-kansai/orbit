"use server";
import { randomBytes, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentShopId } from "@/lib/shop";
import { decrypt, encrypt } from "@/lib/secret";
import { getSettings, patchSettings } from "@/lib/settings";
import { getOfficialPortal } from "@/lib/official";

export type KeyItem = { id: string; label: string; last4: string; createdAt: string };

export async function listApiKeys(): Promise<{ current: { last4: string } | null; keys: KeyItem[] }> {
  const s = await getSettings();
  const portal = await getOfficialPortal();
  let current: { last4: string } | null = null;
  if (portal) {
    const [a] = await db.select().from(schema.shopPortalAccounts).where(and(eq(schema.shopPortalAccounts.shopId, (await currentShopId())), eq(schema.shopPortalAccounts.portalId, portal.id)));
    if (a?.passwordEnc) {
      try { current = { last4: decrypt(a.passwordEnc).slice(-4) }; } catch { current = null; }
    }
  }
  return { current, keys: s.apiKeys.map(({ id, label, last4, createdAt }) => ({ id, label, last4, createdAt })) };
}

/** キーの中身を取り出す（入力欄への貼り付け・コピー用）。id="current" は今保存中のキー */
export async function revealApiKey(id: string) {
  try {
    if (id === "current") {
      const portal = await getOfficialPortal();
      if (!portal) return { ok: false, key: "" };
      const [a] = await db.select().from(schema.shopPortalAccounts).where(and(eq(schema.shopPortalAccounts.shopId, (await currentShopId())), eq(schema.shopPortalAccounts.portalId, portal.id)));
      return a?.passwordEnc ? { ok: true, key: decrypt(a.passwordEnc) } : { ok: false, key: "" };
    }
    const k = (await getSettings()).apiKeys.find((x) => x.id === id);
    return k ? { ok: true, key: decrypt(k.enc) } : { ok: false, key: "" };
  } catch {
    return { ok: false, key: "" };
  }
}

export async function addApiKey(label: string, key: string) {
  const v = key.trim();
  if (v.length < 24) return { ok: false, message: "APIキーは24文字以上です" };
  const s = await getSettings();
  if (s.apiKeys.length >= 20) return { ok: false, message: "登録できるキーは20件までです" };
  for (const k of s.apiKeys) {
    try { if (decrypt(k.enc) === v) return { ok: false, message: `このキーは「${k.label}」として登録済みです` }; } catch {}
  }
  let enc: string;
  try { enc = encrypt(v); } catch (e) { return { ok: false, message: e instanceof Error ? e.message : "暗号化できませんでした" }; }
  const item = { id: randomUUID(), label: label.trim().slice(0, 40) || `キー ${s.apiKeys.length + 1}`, enc, last4: v.slice(-4), createdAt: new Date().toISOString() };
  await patchSettings({ apiKeys: [...s.apiKeys, item] });
  return { ok: true, message: "キーを登録しました" };
}

export async function deleteApiKey(id: string) {
  const s = await getSettings();
  await patchSettings({ apiKeys: s.apiKeys.filter((k) => k.id !== id) });
  return { ok: true };
}

/** 新しいキーを作る（公式サイトの OFFICIAL_API_KEY に入れる用・48文字） */
export async function generateApiKey() {
  return randomBytes(36).toString("base64url");
}
