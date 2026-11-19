/**
 * 女性プロフィールの項目定義（基本情報・コメント・Q&A・画像）。
 * Mr.Venrey「女性プロフィール編集」の項目名・文字数・必須/推奨に合わせています（2026-11-19 確認）。
 * 各ポータル専用の項目は sites.ts にあります。
 */

export const CUPS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const BLOOD_TYPES = ["A", "B", "O", "AB"] as const;

export const STYLES = [
  "激スレンダー", "スレンダー", "スタンダード", "グラマー", "セクシー", "ぽちゃ", "激ぽちゃ",
  "長身", "小柄", "巨乳", "美乳", "美脚", "美白",
] as const;

export const CAST_TYPES = [
  "かわいい系", "きれい系", "清楚", "癒し系", "セクシー系", "痴女系", "ギャル系", "ロリ系", "萌え系",
  "アイドル系", "OL系", "お姉さん系", "モデル系", "女子大生系", "お嬢様系", "S女系", "M女系", "人妻系",
  "熟女系", "素人系", "現役AV嬢", "元AV嬢", "外国人(アジア系)", "外国人(金髪系)", "ニューハーフ",
] as const;

/** コメントの文字数別タブ（"base" は基本、"html" はHTMLタグ） */
export const COMMENT_TABS = [
  { key: "base", label: "基本" },
  { key: "50", label: "50文字" },
  { key: "100", label: "100文字" },
  { key: "150", label: "150文字" },
  { key: "200", label: "200文字" },
  { key: "300", label: "300文字" },
  { key: "500", label: "500文字" },
  { key: "1000", label: "1000文字" },
  { key: "html", label: "HTMLタグ" },
] as const;
export const COMMENT_MAX = 10000;

export const COMMENT_FIELDS = [
  { key: "shopComment", label: "お店コメント", note: "" },
  { key: "message", label: "女の子コメント", note: "" },
  { key: "comment", label: "コメント", note: "未入力の場合は「お店コメント」で更新します（文字数オーバーの場合は空白のまま更新します）" },
] as const;
export type CommentKey = (typeof COMMENT_FIELDS)[number]["key"];

export const PHOTO_MAX = 15;
export const THUMB_MAX = 5;
export const QA_MAX = 30;
export const QA_Q_MAX = 500;

/** 基本情報の文字数（Infinity は上限なし） */
export const TEXT_MAX = {
  name: 10,
  kana: 15,
  hiragana: 15,
  romaji: 50,
  catchCopy: 10,
  shortComment: 20,
  erogenousZone: 50,
  hobby: 50,
  specialPlay: 50,
  hometown: 10,
  zodiac: 7,
} as const;

/** 推奨のテキスト項目 */
export const PROFILE_TEXTS = [
  { key: "erogenousZone", label: "性感帯", max: 50 },
  { key: "hobby", label: "趣味", max: 50 },
  { key: "specialPlay", label: "得意プレイ", max: 50 },
  { key: "charmPoint", label: "チャームポイント", max: Infinity },
  { key: "idealType", label: "好きなタイプ", max: Infinity },
  { key: "firstExperience", label: "初体験", max: Infinity },
  { key: "hometown", label: "出身地", max: 10 },
  { key: "zodiac", label: "星座", max: 7 },
] as const;

/** 必須の10項目（Venreyと同じ） */
export const REQUIRED = [
  { key: "name", label: "女性名" },
  { key: "kana", label: "カタカナ" },
  { key: "hiragana", label: "ひらがな" },
  { key: "age", label: "年齢" },
  { key: "bust", label: "バスト" },
  { key: "cup", label: "カップ" },
  { key: "waist", label: "ウエスト" },
  { key: "hip", label: "ヒップ" },
  { key: "height", label: "身長" },
  { key: "shortComment", label: "ショートコメント" },
] as const;

/** 生年月日（YYYY-MM-DD）から、基準日（YYYY-MM-DD）時点の年齢 */
export function ageOn(birthday: string, today: string): number | null {
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday);
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today);
  if (!b || !t) return null;
  let age = Number(t[1]) - Number(b[1]);
  if (t[2] + t[3] < b[2] + b[3]) age--;
  return age;
}

/** 星座（生年月日から） */
export function zodiacOf(birthday: string): string {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(birthday);
  if (!m) return "";
  const md = Number(m[1]) * 100 + Number(m[2]);
  const T: [number, string][] = [
    [120, "山羊座"], [219, "水瓶座"], [321, "魚座"], [420, "牡羊座"], [521, "牡牛座"], [622, "双子座"],
    [723, "蟹座"], [823, "獅子座"], [923, "乙女座"], [1024, "天秤座"], [1123, "蠍座"], [1222, "射手座"], [1232, "山羊座"],
  ];
  return T.find(([to]) => md < to)?.[1] ?? "";
}
