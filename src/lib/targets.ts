import { SITES } from "./sites";

/** 店舗の連動先サイト（未設定なら全部） */
export function targetSitesOf(shop: { targetSites: string[] }) {
  const known = new Set(SITES.map((s) => s.code));
  const t = (shop.targetSites ?? []).filter((c) => known.has(c));
  return t.length ? SITES.map((s) => s.code).filter((c) => t.includes(c)) : SITES.map((s) => s.code);
}
