import type { schema } from "@/db";

export type QaItem = { q: string; a: string };

/** 編集画面とサーバーのあいだでやりとりする女性プロフィール */
export type CastInput = {
  name: string;
  kana: string;
  hiragana: string;
  romaji: string;
  joinedOn: string;
  isNew: boolean;
  isPublished: boolean;
  age: number | string | null;
  ageFromBirthday: boolean;
  birthday: string;
  bust: number | string | null;
  cup: string;
  waist: number | string | null;
  hip: number | string | null;
  height: number | string | null;
  weight: number | string | null;
  bloodType: string;
  style: string;
  castType: string;
  styleBySite: Record<string, string>;
  typeBySite: Record<string, string>;
  catchCopy: string;
  shortComment: string;
  erogenousZone: string;
  hobby: string;
  specialPlay: string;
  charmPoint: string;
  idealType: string;
  firstExperience: string;
  hometown: string;
  zodiac: string;
  drinks: string;
  smokes: string;
  showFace: string;
  mobileEmail: string;
  pcEmail: string;
  shopComment: string;
  message: string;
  comment: string;
  shopCommentByLength: Record<string, string>;
  messageByLength: Record<string, string>;
  commentByLength: Record<string, string>;
  siteFields: Record<string, Record<string, string | string[]>>;
  qa: QaItem[];
  qaBySite: Record<string, QaItem[]>;
  memo: string;
};

type Cast = typeof schema.casts.$inferSelect;

export function toInput(c: Cast | null): CastInput {
  return {
    name: c?.name ?? "",
    kana: c?.kana ?? "",
    hiragana: c?.nameKana ?? "",
    romaji: c?.romaji ?? "",
    joinedOn: c?.joinedOn ?? "",
    isNew: c?.isNew ?? false,
    isPublished: c?.isPublished ?? true,
    age: c?.age ?? "",
    ageFromBirthday: c?.ageFromBirthday ?? false,
    birthday: c?.birthday ?? "",
    bust: c?.bust ?? "",
    cup: c?.cup ?? "",
    waist: c?.waist ?? "",
    hip: c?.hip ?? "",
    height: c?.height ?? "",
    weight: c?.weight ?? "",
    bloodType: c?.bloodType ?? "",
    style: c?.bodyType ?? "",
    castType: c?.castType ?? "",
    styleBySite: c?.styleBySite ?? {},
    typeBySite: c?.typeBySite ?? {},
    catchCopy: c?.catchCopy ?? "",
    shortComment: c?.shortComment ?? "",
    erogenousZone: c?.erogenousZone ?? "",
    hobby: c?.hobby ?? "",
    specialPlay: c?.specialPlay ?? "",
    charmPoint: c?.charmPoint ?? "",
    idealType: c?.idealType ?? "",
    firstExperience: c?.firstExperience ?? "",
    hometown: c?.hometown ?? "",
    zodiac: c?.zodiac ?? "",
    drinks: c?.drinks ?? "",
    smokes: c?.smokes ?? "",
    showFace: c?.showFace ?? "",
    mobileEmail: c?.mobileEmail ?? "",
    pcEmail: c?.pcEmail ?? "",
    shopComment: c?.shopComment ?? "",
    message: c?.message ?? "",
    comment: c?.comment ?? "",
    shopCommentByLength: c?.shopCommentByLength ?? {},
    messageByLength: c?.messageByLength ?? {},
    commentByLength: c?.commentByLength ?? {},
    siteFields: c?.siteFields ?? {},
    qa: c?.qa ?? [],
    qaBySite: c?.qaBySite ?? {},
    memo: c?.memo ?? "",
  };
}
