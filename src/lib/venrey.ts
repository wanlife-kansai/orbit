/**
 * Mr.Venrey からの取り込み（読み取り専用）。
 *
 * - Mr.Venrey の店舗ID・パスワードでログインし、GET だけでデータを読みます。
 *   Mr.Venrey 側のデータを書き換える呼び出し（POST/PUT/DELETE）は一切しません（ログインの /token だけは POST）。
 * - 取り込んだ女性・写真・テンプレート・コンテンツ枠には source_ref（例：venrey:3031045）を付け、
 *   何度取り込んでも重複せず「上書き更新」になります。ORBIT で手で追加したものには触りません。
 * - ポータルのID・パスワード（ID・PASS登録）は取り込みません。ORBIT からポータルへ勝手に配信されないようにするためです。
 */
import { and, eq, inArray, like } from "drizzle-orm";
import { db, schema } from "@/db";
import { decrypt, encrypt } from "./secret";
import { removeImage, saveImage } from "./storage";
import { CUPS } from "./castFields";
import { SITE_FIELDS, INBOUND_FIELDS, COMMON_FIELDS, ALL_SITES, siteName, type FieldDef } from "./sites";
import { CATALOG } from "./contentCatalog";

const API = "https://webapi2.mrvenrey.jp";
const BLOB = "https://mrvenreyweb.blob.core.windows.net";
const { casts, castPhotos, schedules, templates, contents } = schema;
/** Venrey が持っている写真のサイズ（大きい順）。base は正方形にトリミングされた元画像 */
const PHOTO_SIZES = ["900_1200", "600_800", "base"];

export type VenreySession = { token: string; sas: string; vid: string; exp: number };

/* ───────── 接続 ───────── */

export async function venreyLogin(loginId: string, password: string): Promise<VenreySession> {
  const res = await fetch(`${API}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "password", username: loginId, password }).toString(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(res.status === 400 ? "Mr.VenreyのIDまたはパスワードが違います" : `Mr.Venreyにログインできませんでした（${res.status}）`);
  const j = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) throw new Error("Mr.Venreyのログイン結果を読めませんでした");
  const sess: VenreySession = { token: j.access_token, sas: "", vid: loginId, exp: Date.now() + (j.expires_in ?? 3600) * 1000 };
  const sas = await vget<{ GirlSAS?: string }>(sess, "blobsasses");
  sess.sas = sas.GirlSAS ?? "";
  return sess;
}

export const packSession = (s: VenreySession) => encrypt(JSON.stringify(s));
export function unpackSession(token: string): VenreySession {
  const s = JSON.parse(decrypt(token)) as VenreySession;
  if (!s?.token || s.exp < Date.now() + 60_000) throw new Error("Mr.Venreyとの接続が切れました。もう一度「接続」してください");
  return s;
}

async function vget<T>(s: VenreySession, path: string): Promise<T> {
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`${API}/api/${path}`, {
      headers: { Authorization: `Bearer ${s.token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (res.status === 401) throw new Error("Mr.Venreyとの接続が切れました。もう一度「接続」してください");
    if (res.ok) return (await res.json()) as T;
    if (res.status < 500) throw new Error(`Mr.Venreyの読み込みに失敗しました（${path}：${res.status}）`);
    await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  throw new Error(`Mr.Venreyが応答しません（${path}）`);
}

/* ───────── 女性一覧 ───────── */

type VListGirl = { GirlId: number; Name: string; SortNo: number; IsDisp: boolean; IsNewface: boolean };
export async function listGirls(s: VenreySession) {
  const r = await vget<{ GirlsList: VListGirl[] }>(s, "girls/list");
  return r.GirlsList.map((g) => ({ id: g.GirlId, name: g.Name, sortNo: g.SortNo }));
}

/* ───────── 女性1人分 ───────── */

type Ctl = { ControlId: string; LabelName: string; InputType: number; FormValue: unknown; OptionValue?: { ElementValue: string; ElementLabel: string }[] };
type VDetail = {
  GirlProfile: Record<string, unknown>;
  GirlProfileInputForm: { PatternId: string; Baitai: { BaitaiName: string }[]; Controls: Ctl[] }[];
  GirlsCmnQAList: { QANo: number; Question: string | null; Answer: string | null }[];
};

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const int = (v: unknown) => {
  const n = Number(v);
  return v === null || v === undefined || v === "" || !Number.isFinite(n) || n === 0 ? null : Math.round(n);
};
const day = (v: unknown) => {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(str(v));
  return m ? m[1] : "";
};
const hhmm = (v: unknown) => {
  const m = /T?(\d{2}):(\d{2})/.exec(str(v));
  return m ? `${m[1]}:${m[2]}` : "";
};
const clean = (v: unknown) => str(v).replace(/\t+$/g, "").replace(/\r\n/g, "\n").trim();

const BLOOD = ["A", "B", "O", "AB"];
const ZODIAC: Record<string, string> = {
  おひつじざ: "牡羊座", おうしざ: "牡牛座", ふたござ: "双子座", かにざ: "蟹座", ししざ: "獅子座", おとめざ: "乙女座",
  てんびんざ: "天秤座", さそりざ: "蠍座", いてざ: "射手座", やぎざ: "山羊座", みずがめざ: "水瓶座", うおざ: "魚座",
};
const LENGTHS = ["50", "100", "150", "200", "300", "500", "1000"];

function byLength(p: Record<string, unknown>, prefix: string) {
  const out: Record<string, string> = {};
  const base = str(p[`${prefix}Default`]);
  for (const n of LENGTHS) {
    const v = str(p[`${prefix}${n}`]);
    if (v && v !== base) out[n] = v; // 基本と同じなら持たない（ORBITでは未入力＝基本を使う）
  }
  const tag = str(p[`${prefix}Tag`]);
  if (tag) out.html = tag;
  return out;
}

/* 各サイト項目：Venrey の ControlId → ORBIT の項目 */
const SITE_MAP: Record<string, Record<string, string | string[]>> = {
  cityheaven: { entryRoute: "entryRoute", imageRotation: "photoRotation", salesPoint: "salesPoints" },
  deli_japan: { detailed_search1: "tag1", detailed_search2: "tag2", detailed_searches: "tags", girl_trial: "trial" },
  deli_town: { basicPlay: "basicPlay", optionPlay: "optionPlay" },
  purelovers: { tobacco: "smokingUpdate", sake: "drinks", basicPlay: "plays", optionPlay: "plays", subtag: "subTags" },
  fucolle: { appealPointValues: "appealPoints" },
  ekichika: {
    local_area1: "genre1", local_area2: "genre2", local_area3: "genre3", chkGenreValues: "genres", options: "options",
    rookie_flg: "newTrial", p_genre1: "priority1", p_genre2: "priority2", p_genre3: "priority3", message_title: "messageTitle",
  },
  mieccha: { okplay: "plays" },
  fuzoku_japan: {
    honshimei: "honshimei", shimei: "shimei", is_same_shop_main_reservation: "honshimeiFromCourse", is_same_shop_reservation: "shimeiFromCourse",
    tag_display_tall: "showHeight", tag_display_breast: "showBust", tag_display_sm: "showSm", detailed_search1: "tag1", detailed_search2: "tag2",
    detailed_searches: ["looks", "personalityTags", "type", "play", "features"], girl_sm: "smLevel", girl_trial: "trial",
  },
};
const COMMON_MAP: Record<string, string> = {
  lady_url: "profileUrl", twitter_url: "xUrl", instagram_url: "instagramUrl", bluesky_url: "blueskyUrl", personality: "personality", prev_job: "prevJob",
};
const INBOUND_MAP: Record<string, string> = {
  display_on_inbound: "show", comment_English: "commentEn", checkBox_chinese: "langZh", checkBox_english: "langEn", checkBox_japanese: "langJa",
  checkBox_korean: "langKo", girlName_English: "nameEn", FreeTitle: "yoasobiTitle", FreeBody: "yoasobiBody",
  LauguageLevelEn: "levelEn", LauguageLevelZh: "levelZh", LauguageLevelKr: "levelKo",
};

const norm = (s: string) => s.replace(/[\s　（）()【】]/g, "");
const siteCodeByName = new Map(ALL_SITES.map((s) => [norm(s.name), s.code]));

function fieldDef(site: string, key: string): FieldDef | undefined {
  if (site === "inbound") return INBOUND_FIELDS.find((f) => f.key === key);
  if (site === "common") return COMMON_FIELDS.find((f) => f.key === key);
  return SITE_FIELDS.find((s) => s.code === site)?.fields.find((f) => f.key === key);
}
const multiOptions = (f: FieldDef | undefined) => (f && f.type === "multi" ? f.groups.flatMap((g) => g.options as readonly string[]) : []);

/** 選択肢の値 → 表示名（ORBITは表示名で持つ） */
function labelsOf(c: Ctl): string[] {
  let raw: unknown = c.FormValue;
  if (typeof raw === "string" && raw.startsWith("[")) {
    try {
      raw = JSON.parse(raw);
    } catch {
      /* そのまま */
    }
  }
  const vals = (Array.isArray(raw) ? raw : [raw]).map(str).filter((v) => v !== "");
  if (!c.OptionValue?.length) return vals;
  return vals.map((v) => c.OptionValue!.find((o) => o.ElementValue === v)?.ElementLabel ?? v);
}

function siteValues(d: VDetail) {
  const fields: Record<string, Record<string, string | string[]>> = {};
  const qaBySite: Record<string, { q: string; a: string }[]> = {};
  const put = (site: string, key: string, v: string | string[]) => {
    (fields[site] ??= {})[key] = v;
  };
  const putMulti = (site: string, keys: string[], labels: string[]) => {
    for (const l of labels) {
      const key = keys.find((k) => multiOptions(fieldDef(site, k)).includes(l)) ?? keys[0];
      const cur = (fields[site]?.[key] as string[] | undefined) ?? [];
      if (!cur.includes(l)) put(site, key, [...cur, l]);
    }
  };

  for (const form of d.GirlProfileInputForm ?? []) {
    const names = form.Baitai.map((b) => b.BaitaiName);
    const isInbound = names.length === 1 && names[0].includes("インバウンド");
    const codes = names.map((n) => (n.startsWith("オフィシャル") ? "official" : siteCodeByName.get(norm(n)))).filter(Boolean) as string[];
    const qa: Record<number, { q: string; a: string }> = {};

    for (const c of form.Controls) {
      const has = c.FormValue !== null && c.FormValue !== undefined && str(c.FormValue) !== "";
      // Q&A（質問N/回答N、項目名N/内容N、QN/AN、段落N、項目内容N）
      const qm = /^(?:question|answer)(\d+)$/.exec(c.ControlId) ?? /^(?:質問|回答|項目名|内容)(\d+)$/.exec(c.LabelName);
      if (qm) {
        const n = Number(qm[1]);
        const isQ = /^question/.test(c.ControlId) || /^(質問|項目名)/.test(c.LabelName);
        if (has) (qa[n] ??= { q: "", a: "" })[isQ ? "q" : "a"] = clean(c.FormValue);
        continue;
      }
      if (!has) continue;
      if (COMMON_MAP[c.ControlId]) {
        put("common", COMMON_MAP[c.ControlId], clean(c.FormValue));
        continue;
      }
      if (isInbound || INBOUND_MAP[c.ControlId]) {
        const key = INBOUND_MAP[c.ControlId];
        if (key) put("inbound", key, c.OptionValue?.length ? labelsOf(c)[0] ?? "" : clean(c.FormValue));
        continue;
      }
      for (const site of codes) {
        // ぴゅあらば：新人アイコン表示開始日付（年・月・日）
        if (site === "purelovers" && ["year", "month", "day"].includes(c.ControlId)) {
          const cur = String(fields.purelovers?.newIconFrom ?? "--").split("-");
          const idx = { year: 0, month: 1, day: 2 }[c.ControlId as "year" | "month" | "day"];
          cur[idx] = idx === 0 ? str(c.FormValue) : str(c.FormValue).padStart(2, "0");
          put("purelovers", "newIconFrom", cur.join("-"));
          continue;
        }
        const target = SITE_MAP[site]?.[c.ControlId];
        if (!target) {
          // 対応表にない項目は「その他（Venrey）」として残す（失わないように）
          put(site, `venrey:${c.ControlId}`, c.OptionValue?.length ? labelsOf(c).join("、") : clean(c.FormValue));
          continue;
        }
        const keys = Array.isArray(target) ? target : [target];
        const def = fieldDef(site, keys[0]);
        if (def?.type === "multi" || c.InputType === 3) putMulti(site, keys, labelsOf(c));
        else if (def?.type === "select" || c.OptionValue?.length) put(site, keys[0], labelsOf(c)[0] ?? "");
        else put(site, keys[0], clean(c.FormValue));
      }
    }
    const list = Object.keys(qa)
      .map(Number)
      .sort((a, b) => a - b)
      .map((n) => qa[n])
      .filter((x) => x.q || x.a);
    if (list.length) for (const site of codes) qaBySite[site] = list;
  }
  return { fields, qaBySite };
}

export function mapGirl(d: VDetail) {
  const p = d.GirlProfile;
  const cupIdx = p.Cup === null || p.Cup === undefined ? -1 : Number(p.Cup);
  const bloodIdx = Number(p.Blood);
  const birthday = p.BirthY && p.BirthM && p.BirthD ? `${p.BirthY}-${String(p.BirthM).padStart(2, "0")}-${String(p.BirthD).padStart(2, "0")}` : "";
  const { fields, qaBySite } = siteValues(d);
  // Venrey の別名1〜10（同じ女性として扱う名前）→ ORBIT 別名管理の「同一女性の別名」
  const same = Array.from({ length: 10 }, (_, i) => str(p[`SubName${i + 1}`]).trim()).filter(Boolean);
  if (same.length) fields._alias = { _same: same.join("、") };
  const pr = str(p.PrDefault);
  if (pr) fields.venrey_pr = { base: pr, ...byLength(p, "Pr") };

  return {
    sourceRef: `venrey:${p.GirlId}`,
    name: str(p.Name).trim(),
    kana: str(p.NameKatakana).trim(),
    nameKana: str(p.NameHiragana).trim(),
    romaji: str(p.NameRoman).trim(),
    age: int(p.Age),
    height: int(p.Height),
    bust: int(p.Bust),
    waist: int(p.Waist),
    hip: int(p.Hip),
    weight: int(p.Weight),
    cup: cupIdx >= 0 && cupIdx < CUPS.length ? CUPS[cupIdx] : "",
    bloodType: bloodIdx >= 0 && bloodIdx < 4 ? BLOOD[bloodIdx] : "",
    bodyType: str(p.StyleName),
    castType: str(p.TypeName),
    joinedOn: day(p.Entryday),
    birthday,
    ageFromBirthday: !!p.IsBirthday,
    hometown: str(p.Birthplace),
    zodiac: ZODIAC[str(p.Star)] ?? str(p.Star),
    firstExperience: str(p.Hatutaiken),
    erogenousZone: str(p.Seikantai),
    specialPlay: str(p.TokuiPlay),
    charmPoint: str(p.Charmpoint),
    idealType: str(p.Favorite),
    hobby: str(p.Hobby),
    drinks: Number(p.IsSake) === 1 ? "飲む" : "飲まない",
    smokes: Number(p.IsTobacco) === 1 ? "吸う" : "吸わない",
    showFace: Number(p.IsFace) === 1 ? "設定する" : "設定しない",
    mobileEmail: str(p.MailMob),
    pcEmail: str(p.MailPc),
    shopComment: str(p.ShopCommentDefault),
    shopCommentByLength: byLength(p, "ShopComment"),
    message: str(p.GirlCommentDefault),
    messageByLength: byLength(p, "GirlComment"),
    comment: str(p.CommentDefault),
    commentByLength: byLength(p, "Comment"),
    catchCopy: str(p.CatchCopy10),
    shortComment: str(p.CatchCopy20),
    sokuhimeComment: str(p.SokuhimeComment),
    isNew: Number(p.IsNewface) === 1,
    isPublished: Number(p.IsDisp) === 1,
    memo: str(p.Memo),
    sortOrder: Number(p.SortNo) || 0,
    qa: (d.GirlsCmnQAList ?? [])
      .sort((a, b) => a.QANo - b.QANo)
      .map((x) => ({ q: clean(x.Question), a: clean(x.Answer) }))
      .filter((x) => x.q || x.a),
    qaBySite,
    siteFields: fields,
    photos: [
      ...Array.from({ length: 15 }, (_, i) => str(p[`Image${i + 1}`])).filter(Boolean).map((uuid, i) => ({ uuid, kind: "photo", order: i + 1 })),
      ...Array.from({ length: 5 }, (_, i) => str(p[`ThumbImage${i + 1}`])).filter(Boolean).map((uuid, i) => ({ uuid, kind: "thumb", order: i + 1 })),
    ],
  };
}

/** 女性1人を取り込む（新規 or 上書き）。写真もここで同期する。 */
export async function importGirl(s: VenreySession, shopId: number, girlId: number) {
  const d = await vget<VDetail>(s, `girls?GirlId=${girlId}`);
  const { photos, ...v } = mapGirl(d);
  if (!v.name) return { castId: 0, created: false, photos: 0, name: "" };
  const [exists] = await db.select({ id: casts.id }).from(casts).where(and(eq(casts.shopId, shopId), eq(casts.sourceRef, v.sourceRef)));
  let castId: number;
  let created = false;
  if (exists) {
    castId = exists.id;
    await db.update(casts).set(v).where(eq(casts.id, castId));
  } else {
    const [row] = await db.insert(casts).values({ ...v, shopId }).returning({ id: casts.id });
    castId = row.id;
    created = true;
  }
  const added = await syncPhotos(s, shopId, castId, photos);
  return { castId, created, photos: added, name: v.name };
}

async function syncPhotos(s: VenreySession, shopId: number, castId: number, want: { uuid: string; kind: string; order: number }[]) {
  const have = await db
    .select()
    .from(castPhotos)
    .where(and(eq(castPhotos.castId, castId), like(castPhotos.sourceRef, "venrey:%")));
  // 大きい順に探す（900×1200 → 600×800 → 正方形のbase）。取れたサイズを source_ref に残し、サイズが上がったら取り直す
  const key = (kind: string, uuid: string) => `venrey:${kind}:${uuid}@`;
  const wantKeys = new Set(want.map((w) => key(w.kind, w.uuid)));
  // サイズ付きで入っている写真はそのまま（取り直さない）。サイズの記録がない古い取り込み分だけ差し替える
  const best = (ref: string) => PHOTO_SIZES.some((sz) => ref.endsWith(`@${sz}`));
  // Venrey で消えた写真・小さいサイズで入っていた写真は外す（ORBIT で手で追加した写真はそのまま）
  const gone = have.filter((h) => !best(h.sourceRef) || !wantKeys.has(h.sourceRef.slice(0, h.sourceRef.lastIndexOf("@") + 1)));
  for (const g of gone) await removeImage(g.url);
  if (gone.length) await db.delete(castPhotos).where(inArray(castPhotos.id, gone.map((g) => g.id)));
  let added = 0;
  for (const w of want) {
    const k = key(w.kind, w.uuid);
    const cur = have.find((h) => h.sourceRef.startsWith(k) && !gone.includes(h));
    if (cur) {
      if (cur.sortOrder !== w.order) await db.update(castPhotos).set({ sortOrder: w.order }).where(eq(castPhotos.id, cur.id));
      continue;
    }
    let res: Response | null = null;
    let size = "";
    for (const sz of PHOTO_SIZES) {
      const r = await fetch(`${BLOB}/${s.vid}/image/girls/${w.uuid}/${sz}.jpg${s.sas}`, { cache: "no-store" });
      if (r.ok) {
        res = r;
        size = sz;
        break;
      }
    }
    if (!res) continue;
    const buf = await res.arrayBuffer();
    const type = res.headers.get("content-type")?.includes("png") ? "image/png" : "image/jpeg";
    const url = await saveImage(new File([buf], `${w.uuid}.jpg`, { type }), `shop${shopId}/cast${castId}`);
    await db.insert(castPhotos).values({ shopId, castId, kind: w.kind, url, sortOrder: w.order, sourceRef: k + size });
    added++;
  }
  return added;
}

/* ───────── 出勤 ───────── */

type VSched = { GirlId: number; ScheduleDate: string | null; StartTime: string | null; EndTime: string | null; ScheduleStatus: number | null; Youbi: number };
type VSchedResp = { BasicList: VSched[]; ScheduleList: VSched[] };

/** from〜to（YYYY-MM-DD）の出勤を週単位で読む（月表示のAPIは女性1人ずつなので使わない） */
export async function importSchedules(s: VenreySession, shopId: number, from: string, to: string) {
  const rows = await db.select({ id: casts.id, ref: casts.sourceRef }).from(casts).where(and(eq(casts.shopId, shopId), like(casts.sourceRef, "venrey:%")));
  const byGirl = new Map(rows.map((r) => [Number(r.ref.slice(7)), r.id]));

  // 基本出勤（曜日ごと）：Youbi 1=日 … 7=土
  const week = await vget<VSchedResp>(s, "schedules/week/");
  const base = new Map<number, Record<string, { start: string; end: string; off?: boolean }>>();
  for (const b of week.BasicList) {
    const castId = byGirl.get(b.GirlId);
    if (!castId || b.ScheduleStatus === null) continue;
    const m = base.get(castId) ?? {};
    const wd = String(b.Youbi - 1);
    if (b.ScheduleStatus === 1 && b.StartTime) m[wd] = { start: hhmm(b.StartTime), end: hhmm(b.EndTime) };
    else if (b.ScheduleStatus === 0) m[wd] = { start: "", end: "", off: true };
    base.set(castId, m);
  }
  for (const [castId, bs] of base) await db.update(casts).set({ baseSchedule: bs }).where(eq(casts.id, castId));

  // 日ごとの出勤（from〜to を1週間ずつ）
  const seen = new Set<string>();
  let n = 0;
  const all = [...week.ScheduleList];
  for (let d = new Date(`${from}T00:00:00Z`); d.toISOString().slice(0, 10) <= to; d = new Date(d.getTime() + 7 * 86400_000)) {
    all.push(...(await vget<VSchedResp>(s, `schedules/week/?Range=${d.toISOString().slice(0, 10)}`)).ScheduleList);
  }
  for (const x of all) {
    const castId = byGirl.get(x.GirlId);
    const date = day(x.ScheduleDate);
    if (!castId || !date || (x.ScheduleStatus !== 0 && x.ScheduleStatus !== 1)) continue;
    const k = `${castId}:${date}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const off = x.ScheduleStatus === 0;
    const start = off ? "" : hhmm(x.StartTime);
    const end = off ? "" : hhmm(x.EndTime);
    await db
      .insert(schedules)
      .values({ shopId, castId, date, start, end, off })
      .onConflictDoUpdate({ target: [schedules.castId, schedules.date], set: { start, end, off } });
    n++;
  }
  return { base: base.size, days: n };
}

/* ───────── テンプレート ───────── */

type VTemplate = Record<string, unknown> & { CmnTemplateId: number; SortNo: number };
export async function importTemplates(s: VenreySession, shopId: number) {
  const r = await vget<{ CmnTemplate: VTemplate[] }>(s, "cmntemplates/list");
  let n = 0;
  for (const t of r.CmnTemplate) {
    const ref = `venrey:${t.CmnTemplateId}`;
    const title = str(t.Title) || str(t.TemplateName) || "（無題）";
    const body =
      ["Comment", "Comment1000", "Comment500", "Comment400", "Comment300", "Comment200", "Comment100", "CommentHtml"].map((k) => str(t[k])).find(Boolean) ?? "";
    const v = { title: title.slice(0, 200), body, memo: str(t.Memo), sortOrder: Number(t.SortNo) || 0, sourceRef: ref };
    const [ex] = await db.select({ id: templates.id }).from(templates).where(and(eq(templates.shopId, shopId), eq(templates.sourceRef, ref)));
    if (ex) await db.update(templates).set(v).where(eq(templates.id, ex.id));
    else await db.insert(templates).values({ ...v, shopId, label: "その他" });
    n++;
  }
  return n;
}

/* ───────── コンテンツ更新の枠 ───────── */

type VContent = { BaseSeq: string; BaitaiCode: string; ContentsName: string; ContentsDispName: string; ContentsMemo: string | null; IsActive: boolean };
export async function importContents(s: VenreySession, shopId: number) {
  const r = await vget<{ ContentsList: VContent[] }>(s, "contents");
  // サイト名は ORBIT 側に「（求人）」などが付くので、付けた名前・外した名前の両方で照らし合わせる
  const byName = new Map<string, (typeof CATALOG)[number]>();
  for (const c of CATALOG) {
    const n = siteName(c.site);
    for (const v of [n, n.replace(/（[^（）]*）$/, "")]) byName.set(norm(`${v}${c.label}`), c);
  }
  const official = (name: string) => {
    const m = /^オフィシャル（[^)）]*[)）](.*)$/.exec(name);
    return m ? CATALOG.find((c) => c.site === "official" && norm(c.label) === norm(m[1])) : undefined;
  };
  let matched = 0;
  const unmatched: string[] = [];
  for (const c of r.ContentsList) {
    const it = byName.get(norm(c.ContentsName)) ?? byName.get(norm(c.ContentsDispName)) ?? official(c.ContentsName);
    if (!it) {
      unmatched.push(c.ContentsName);
      continue;
    }
    // 取り込んだ枠は「停止中」のまま。ID・PASSも入れないので、ORBITから勝手に投稿されることはありません
    await db
      .insert(contents)
      .values({ shopId, site: it.site, slot: it.slot, name: c.ContentsDispName || c.ContentsName, kind: it.kind, memo: str(c.ContentsMemo), active: false, sourceRef: `venrey:${c.BaseSeq}` })
      .onConflictDoUpdate({ target: [contents.shopId, contents.site, contents.slot], set: { name: c.ContentsDispName || c.ContentsName, memo: str(c.ContentsMemo), sourceRef: `venrey:${c.BaseSeq}` } });
    matched++;
  }
  return { total: r.ContentsList.length, matched, unmatched };
}

/* ───────── 連動しているサイト（ID・パスワード） ───────── */

type VBaitai = { BaitaiCode: string; BaitaiName: string; IsOfficial: boolean; LoginId: string | null; LoginPasswd: string | null; ShopPageUrl: string | null; BaitaiMemo: string | null; LoginPageUrl: string | null };

/**
 * Venrey の「ID・PASS登録」にある各サイトのログイン情報を、ORBIT の「サイトのログイン情報」へ写す。
 * パスワードはサーバーの中だけで暗号化して保存し、画面には出しません。
 * オフィシャル（公式サイト）は風俗データセンターのログインなので「風俗データセンター（まるごとHP）」へ。すでに登録済みなら上書きしません。
 * あわせて、写したサイトを店舗の「連動先サイト」にします。
 */
export async function importAccounts(s: VenreySession, shopId: number) {
  const list = (await vget<VBaitai[]>(s, "baitaisettings")).filter((b) => b.LoginId);
  const allPortals = await db.select().from(schema.portals);
  const byCode = new Map(allPortals.map((p) => [p.code, p]));
  const byName = new Map<string, string>();
  for (const site of ALL_SITES) for (const v of [site.name, site.name.replace(/（[^（）]*）$/, "")]) byName.set(norm(v), site.code);

  const saved: string[] = [];
  const skipped: string[] = [];
  const unmatched: string[] = [];
  for (const b of list) {
    const official = b.IsOfficial || b.BaitaiName.startsWith("オフィシャル");
    const code = official ? "fdc" : byName.get(norm(b.BaitaiName));
    const portal = code ? byCode.get(code) : undefined;
    if (!portal) {
      unmatched.push(b.BaitaiName);
      continue;
    }
    const [cur] = await db
      .select()
      .from(schema.shopPortalAccounts)
      .where(and(eq(schema.shopPortalAccounts.shopId, shopId), eq(schema.shopPortalAccounts.portalId, portal.id)));
    if (official && cur?.loginId) {
      skipped.push(`${portal.name}（登録済みのため上書きしません）`);
      continue;
    }
    const v = {
      loginId: b.LoginId ?? "",
      passwordEnc: b.LoginPasswd ? encrypt(b.LoginPasswd) : cur?.passwordEnc ?? "",
      memo: [b.BaitaiMemo, b.ShopPageUrl ? `掲載ページ：${b.ShopPageUrl}` : ""].filter(Boolean).join("\n").slice(0, 500) || cur?.memo || "",
    };
    if (cur) await db.update(schema.shopPortalAccounts).set(v).where(eq(schema.shopPortalAccounts.id, cur.id));
    else await db.insert(schema.shopPortalAccounts).values({ shopId, portalId: portal.id, ...v });
    saved.push(portal.name);
  }

  // 連動先サイト（各サイト項目のタブに出すサイト）を、写したサイトにそろえる
  const known = new Set(SITE_FIELDS.map((x) => x.code));
  const targets = [...new Set(list.map((b) => byName.get(norm(b.BaitaiName))).filter((c): c is string => !!c && known.has(c)))];
  if (targets.length) await db.update(schema.shops).set({ targetSites: [...targets, "official"] }).where(eq(schema.shops.id, shopId));

  return { total: list.length, saved, skipped, unmatched, targets: targets.length };
}
