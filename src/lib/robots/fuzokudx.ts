/**
 * 風俗DX（fuzokudx.com）店舗管理画面とのやりとり。
 * 画面はJavaScriptなしのフォーム送信型なので、ブラウザを使わずに HTTP でログイン・投稿します。
 * 2026-11-20 に画面の作りを確認して作成：
 *   ログイン   POST /shopmanager.php/menu/auth   （u, loginid, password）→ Cookie「shopmanager」
 *   速報一覧   GET  /shopmanager.php/shopnews
 *   速報登録   POST /shopmanager.php/shopnews/update（multipart：toukoukbn=305, title, content, upddspflg, upddspdate[...], file）
 *   速報削除   GET  /shopmanager.php/shopnews/delete/id/{id}
 * 画面が変わったら、ここを直します。
 */

const BASE = process.env.FUZOKUDX_BASE || "https://fuzokudx.com"; // テスト用に差し替え可能
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 ORBIT";

export type DxNews = { id: string; title: string; body: string; time: string; status: string };

export class DxError extends Error {
  constructor(
    message: string,
    public kind: "ログイン" | "内容" | "制限" | "接続" | "画面変更",
  ) {
    super(message);
  }
}

const decode = (s: string) =>
  s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();

/** 一覧ページのHTMLから速報を読み取る */
export function parseNewsList(html: string): DxNews[] {
  const out: DxNews[] = [];
  const rows = html.match(/<tr class="[^"]*">[\s\S]*?<\/tr>/g) ?? [];
  for (const row of rows) {
    const id = row.match(/shopnews\/delete\/id\/(\d+)/)?.[1];
    if (!id) continue;
    const title = row.match(/<td class="title">\s*<p>([\s\S]*?)<\/p>/)?.[1] ?? "";
    const body = row.match(/<div class="newsTxt">([\s\S]*?)<\/div>/)?.[1] ?? "";
    const time = row.match(/<td class="time">([\s\S]*?)<\/td>/)?.[1] ?? "";
    const status = row.match(/<td class="status">\s*<p>([\s\S]*?)<\/p>/)?.[1] ?? "";
    out.push({ id, title: decode(title), body: decode(body), time: decode(time), status: decode(status) });
  }
  return out;
}

/** 送信後にフォームへ戻されたときのエラー文を拾う */
function findError(html: string): string | null {
  if (!/shopnews\/update/.test(html)) return null; // フォームに戻されていなければエラー扱いしない
  const alertJs = html.match(/alert\(['"]([^'"]{2,200})['"]\)/);
  if (alertJs) return alertJs[1];
  const box = html.match(/<(?:p|div|li|span|dd)[^>]*class="[^"]*(?:error|err|errMsg|errorMsg|warning)[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div|li|span|dd)>/i);
  return box ? decode(box[1]) || "入力内容に問題があり、登録されませんでした" : "入力内容に問題があり、登録されませんでした";
}

/** 「2026/11/20 00:43」（日本時間）→ 何分前か */
export function minutesAgo(time: string, now = new Date()) {
  const m = time.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if (!m) return Infinity;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 9, +m[5]);
  return (now.getTime() - t) / 60000;
}

export class FuzokuDx {
  private cookies = new Map<string, string>();

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

  /** リダイレクトを自分でたどりながら Cookie を保つ */
  private async req(path: string, init: RequestInit = {}, hops = 5): Promise<{ url: string; html: string; status: number }> {
    let url = path.startsWith("http") ? path : BASE + path;
    let opts: RequestInit = init;
    for (let i = 0; i <= hops; i++) {
      let res: Response;
      try {
        res = await fetch(url, {
          ...opts,
          redirect: "manual",
          headers: { "User-Agent": UA, Cookie: this.cookieHeader(), Referer: BASE + "/shopmanager.php/", ...(opts.headers ?? {}) },
          signal: AbortSignal.timeout(20_000),
          cache: "no-store",
        });
      } catch {
        throw new DxError("風俗DXにつながりません", "接続");
      }
      this.store(res);
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        url = new URL(res.headers.get("location")!, url).toString();
        opts = { method: "GET" };
        continue;
      }
      return { url, html: await res.text(), status: res.status };
    }
    throw new DxError("リダイレクトが多すぎます", "画面変更");
  }

  private static isLoggedIn(html: string) {
    return /shopmanager\.php\/menu\/logout/.test(html);
  }

  async login() {
    // ログイン画面を一度開いて Cookie をもらう
    await this.req("/shopmanager.php/");
    const body = new URLSearchParams({ u: "", loginid: this.loginId, password: this.password });
    const r = await this.req("/shopmanager.php/menu/auth", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!FuzokuDx.isLoggedIn(r.html)) {
      const check = await this.req("/shopmanager.php/");
      if (!FuzokuDx.isLoggedIn(check.html)) throw new DxError("ログインできませんでした（IDまたはパスワードを確認してください）", "ログイン");
    }
  }

  async listNews(): Promise<DxNews[]> {
    const r = await this.req("/shopmanager.php/shopnews");
    if (!FuzokuDx.isLoggedIn(r.html)) throw new DxError("ログインが切れました", "ログイン");
    return parseNewsList(r.html);
  }

  /**
   * お店速報を登録。reserveAt を渡すと予約投稿（日本時間）。
   * 成功したかは、送信後の一覧に同じタイトルの新しい速報が増えたかで確かめます。
   */
  async createNews(p: { title: string; content: string; reserveAt?: { y: number; m: number; d: number; h: number; mi: number } }) {
    if (!p.title.trim()) throw new DxError("タイトルが空です", "内容");
    const before = await this.listNews();
    // 30分ルール：直近の登録（他のツールの投稿も含む）から30分たっていなければ送らない
    const latest = Math.min(Infinity, ...before.map((n) => minutesAgo(n.time)).filter((m) => m >= 0)); // 予約（未来）は除く
    if (latest < 30) {
      throw new DxError(`前回の登録から${Math.floor(latest)}分です。風俗DXは登録後30分間は新規登録できません（あと${Math.ceil(30 - latest)}分）`, "制限");
    }

    const form = new FormData();
    form.set("id", "");
    form.set("displimit", "");
    form.set("toukoukbn", "305");
    form.set("title", p.title);
    form.set("content", p.content);
    if (p.reserveAt) {
      const t = p.reserveAt;
      form.set("upddspflg", "1");
      form.set("upddspdate[year]", String(t.y));
      form.set("upddspdate[month]", String(t.m));
      form.set("upddspdate[day]", String(t.d));
      form.set("upddspdate[hour]", String(t.h));
      form.set("upddspdate[minute]", String(t.mi));
    }
    form.set("file", new Blob([]), "");
    const r = await this.req("/shopmanager.php/shopnews/update", { method: "POST", body: form });

    const after = await this.listNews();
    const known = new Set(before.map((n) => n.id));
    const added = after.find((n) => !known.has(n.id) && n.title === p.title.trim());
    if (added) return added;
    const err = findError(r.html);
    if (err) throw new DxError(err, /30分/.test(err) ? "制限" : "内容");
    if (after.length === before.length && after.length >= 3) {
      throw new DxError("登録されませんでした（30分ルール、または3件の上限で受け付けられなかった可能性があります）", "制限");
    }
    throw new DxError("登録できたか確認できませんでした（一覧に新しい速報が見当たりません）", "画面変更");
  }

  async deleteNews(id: string) {
    if (!/^\d+$/.test(id)) throw new DxError("速報のIDが正しくありません", "内容");
    await this.req(`/shopmanager.php/shopnews/delete/id/${id}`);
    const after = await this.listNews();
    if (after.some((n) => n.id === id)) throw new DxError("削除できませんでした", "画面変更");
  }
}
