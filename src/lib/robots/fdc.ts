/**
 * 風俗データセンター（shop.fuzoku-datacenter.com／まるごとHP）店舗管理画面とのやりとり。
 * 画面はShift_JISのフォーム＋jQueryのAJAX。ブラウザを使わずに HTTP で操作します。
 * 2026-11-22 に快楽園 大阪梅田店の画面で確認して作成：
 *   ログイン       GET  https://shop.fuzoku-datacenter.com/ → hidden（___7ug / ___2cs / ___mi）を拾う
 *                  POST /auth/login（username, password, hidden一式）→ https://shop-<店舗番号>.shop.fuzoku-datacenter.com/ へ
 *   1週間の出勤    POST /schedule/week/（nowPage, nowWeek=1〜5：当日から7日ずつ）
 *                  セル：td#scheduleDataTd_<itemId>_<YYYY-MM-DD> の select#from_… / select#to_… / textarea#freeText_…
 *   1日分の変更    POST /ajax/scheduleDataEditWork（itemId, timeArray[day], timeArray[from], timeArray[to], freeText, timeArray[scheduleIconId]）
 *                  時刻は "HH:MM:00"（翌日は 24:00:00〜27:00:00）、休みは "--"
 * 画面が変わったら、ここを直します。
 */

const LOGIN_BASE = "https://shop.fuzoku-datacenter.com";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 ORBIT";

export class FdcError extends Error {
  constructor(
    message: string,
    public kind: "ログイン" | "内容" | "接続" | "画面変更",
  ) {
    super(message);
  }
}

export type FdcDay = { date: string; from: string; to: string; label: string; freeText: string };
export type FdcItem = { itemId: string; name: string };

const sjis = new TextDecoder("shift_jis");
const text = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

function selected(html: string, id: string) {
  const m = new RegExp(`<select[^>]*id="${id}"[^>]*>([\\s\\S]*?)</select>`).exec(html);
  if (!m) return null;
  return /<option[^>]*value="([^"]*)"[^>]*selected/.exec(m[1])?.[1] ?? /<option[^>]*value="([^"]*)"/.exec(m[1])?.[1] ?? "";
}

export class Fdc {
  private cookies = new Map<string, string>();
  base = "";

  constructor(
    private loginId: string,
    private password: string,
  ) {}

  private cookieHeader() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  private store(res: Response) {
    const list = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    for (const c of list) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      if (i > 0) this.cookies.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    }
  }

  private async req(url: string, init: RequestInit = {}, hops = 6): Promise<{ url: string; html: string; status: number }> {
    let opts: RequestInit = init;
    for (let i = 0; i <= hops; i++) {
      let res: Response;
      try {
        res = await fetch(url, {
          ...opts,
          redirect: "manual",
          headers: { "User-Agent": UA, Cookie: this.cookieHeader(), ...(opts.headers ?? {}) },
          signal: AbortSignal.timeout(30_000),
          cache: "no-store",
        });
      } catch {
        throw new FdcError("風俗データセンターにつながりません", "接続");
      }
      this.store(res);
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) {
        url = new URL(loc, url).toString();
        opts = { method: "GET" };
        continue;
      }
      return { url, html: sjis.decode(await res.arrayBuffer()), status: res.status };
    }
    throw new FdcError("リダイレクトが多すぎます", "画面変更");
  }

  private form(fields: Record<string, string>) {
    return { method: "POST", body: new URLSearchParams(fields).toString(), headers: { "Content-Type": "application/x-www-form-urlencoded" } };
  }

  async login() {
    const top = await this.req(`${LOGIN_BASE}/`);
    const f = /<form[^>]*action="\/auth\/login"[^>]*>([\s\S]*?)<\/form>/.exec(top.html)?.[1];
    if (!f) throw new FdcError("ログイン画面が見つかりません", "画面変更");
    const fields: Record<string, string> = {};
    for (const m of f.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
      const name = /name="([^"]+)"/.exec(m[0])?.[1];
      if (name) fields[name] = /value="([^"]*)"/.exec(m[0])?.[1] ?? "";
    }
    Object.assign(fields, { username: this.loginId, password: this.password, width: "1280", height: "1024" });
    const r = await this.req(`${LOGIN_BASE}/auth/login`, { ...this.form(fields), headers: { "Content-Type": "application/x-www-form-urlencoded", Referer: `${LOGIN_BASE}/` } });
    const host = /^https:\/\/shop-\d+\.shop\.fuzoku-datacenter\.com/.exec(r.url)?.[0];
    if (!host) throw new FdcError("ログインできませんでした（IDまたはパスワードを確認してください）", "ログイン");
    this.base = host;
  }

  /** 1週間の出勤ページ（week=1〜5、page=1〜） */
  private async weekPage(week: number, page = 1) {
    const r = await this.req(`${this.base}/schedule/week/`, this.form({ nowPage: String(page), nowWeek: String(week) }));
    if (!/scheduleDataTd_/.test(r.html) && !/weekWorkForm/.test(r.html)) throw new FdcError("出勤ページを読めませんでした（ログインが切れた可能性）", "画面変更");
    return r.html;
  }

  /** 登録されているキャスト（itemId と名前） */
  async listItems(): Promise<FdcItem[]> {
    const out = new Map<string, string>();
    for (let page = 1; page <= 5; page++) {
      const html = await this.weekPage(1, page);
      const before = out.size;
      for (const m of html.matchAll(/href="\/item\/index\/id\/(\d+)"[^>]*class="itemName">\s*([^<]+?)\s*<span/g)) out.set(m[1], text(m[2]));
      if (out.size === before || !/goPage\(\s*\d+\s*\)/.test(html)) break;
    }
    return [...out].map(([itemId, name]) => ({ itemId, name }));
  }

  /** 当日から何週目のページにその日があるか（1〜5、範囲外は null） */
  static weekOf(date: string, today: string) {
    const d = (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400_000;
    if (d < 0 || d > 34) return null;
    return Math.floor(d / 7) + 1;
  }

  /** 1週間分（当日から7日ずつ、week=1〜5）の全キャストの出勤。itemId → 日付 → 値 */
  async readWeek(week: number): Promise<Map<string, Map<string, FdcDay>>> {
    const out = new Map<string, Map<string, FdcDay>>();
    for (let page = 1; page <= 5; page++) {
      const html = await this.weekPage(week, page);
      const before = out.size;
      // セルごとに切り分けてから読む（ページ全体は約2MBあるため）
      const parts = html.split('id="scheduleDataTd_');
      for (const seg of parts.slice(1)) {
        const m = /^(\d+)_(\d{4}-\d{2}-\d{2})"/.exec(seg);
        if (!m) continue;
        const [, itemId, date] = m;
        const key = `${itemId}_${date}`;
        const cell = new RegExp(`id="scheduleDataAnchor_${key}"[^>]*>([\\s\\S]*?)</a>`).exec(seg);
        const free = new RegExp(`<textarea[^>]*id="freeText_${key}"[^>]*>([\\s\\S]*?)</textarea>`).exec(seg);
        const day: FdcDay = { date, from: selected(seg, `from_${key}`) ?? "--", to: selected(seg, `to_${key}`) ?? "--", label: cell ? text(cell[1]) : "", freeText: free ? text(free[1]) : "" };
        if (!out.has(itemId)) out.set(itemId, new Map());
        out.get(itemId)!.set(date, day);
      }
      if (out.size === before || !/goPage\(\s*\d+\s*\)/.test(html)) break;
    }
    return out;
  }

  async readDay(itemId: string, date: string, today: string): Promise<FdcDay> {
    const week = Fdc.weekOf(date, today);
    if (!week) throw new FdcError(`${date} は風俗データセンターで編集できる範囲（当日〜35日）の外です`, "内容");
    for (let page = 1; page <= 5; page++) {
      const html = await this.weekPage(week, page);
      const key = `${itemId}_${date}`;
      if (!html.includes(`scheduleDataTd_${key}`)) {
        if (!/goPage\(\s*\d+\s*\)/.test(html)) break;
        continue;
      }
      const cell = new RegExp(`id="scheduleDataTd_${key}"[\\s\\S]*?id="scheduleDataAnchor_${key}"[^>]*>([\\s\\S]*?)</a>`).exec(html);
      const free = new RegExp(`<textarea[^>]*id="freeText_${key}"[^>]*>([\\s\\S]*?)</textarea>`).exec(html);
      return { date, from: selected(html, `from_${key}`) ?? "--", to: selected(html, `to_${key}`) ?? "--", label: cell ? text(cell[1]) : "", freeText: free ? text(free[1]) : "" };
    }
    throw new FdcError("そのキャストが風俗データセンターの出勤表に見つかりません", "内容");
  }

  /** 1日分の出勤を書き換える。返り値は画面に出る表示（例：「20:00～翌2:00」「お休み」） */
  async writeDay(itemId: string, date: string, from: string, to: string, freeText = "") {
    const r = await this.req(
      `${this.base}/ajax/scheduleDataEditWork`,
      this.form({ itemId, "timeArray[day]": date, "timeArray[from]": from, "timeArray[to]": to, freeText, "timeArray[scheduleIconId]": "" }),
    );
    if (r.status >= 400) throw new FdcError(`風俗データセンターが受け付けませんでした（${r.status}）`, "内容");
    return text(r.html);
  }
}

/** ORBIT の時刻（"HH:MM"、日替わり前は翌日扱い）→ データセンターの値（"HH:MM:00"、翌日は24〜27時） */
export function toFdcTimes(start: string, end: string, dayChangeHour: number) {
  const min = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h < dayChangeHour ? h + 24 : h) * 60 + m;
  };
  const s = min(start);
  let e = min(end);
  if (e <= s) e += 24 * 60;
  const fmt = (x: number) => `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}:00`;
  if (e > 27 * 60) e = 27 * 60; // データセンターは27:00まで
  return { from: fmt(s), to: fmt(e) };
}
