"use client";
import { BLOOD_TYPES, CAST_TYPES, CUPS, PROFILE_TEXTS, STYLES, TEXT_MAX, ageOn, zodiacOf } from "@/lib/castFields";
import { siteName } from "@/lib/sites";
import type { CastInput } from "../types";
import { Card, Counter, NumInput, Row, Seg, Select, Switch, TextInput } from "./ui";

type Props = {
  v: CastInput;
  set: <K extends keyof CastInput>(k: K, val: CastInput[K]) => void;
  targetSites: string[];
  today: string;
};

/** スタイル・タイプ：全サイト共通の値と、サイトごとの値 */
function PerSite({
  value,
  bySite,
  options,
  sites,
  onValue,
  onBySite,
}: {
  value: string;
  bySite: Record<string, string>;
  options: readonly string[];
  sites: string[];
  onValue: (v: string) => void;
  onBySite: (v: Record<string, string>) => void;
}) {
  const perSite = Object.keys(bySite).length > 0;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={value} onChange={onValue} options={options} className="min-w-48" />
        <Switch
          checked={perSite}
          onChange={(on) => onBySite(on ? Object.fromEntries(sites.filter((s) => s !== "official").map((s) => [s, value])) : {})}
          label={<span className="text-xs text-zinc-400">サイトごとに設定する</span>}
        />
      </div>
      {perSite && (
        <div className="grid gap-1.5 rounded-lg bg-zinc-950/60 p-3 ring-1 ring-zinc-800 sm:grid-cols-2">
          {Object.keys(bySite).map((s) => (
            <label key={s} className="flex items-center justify-between gap-2 text-xs text-zinc-400">
              <span className="truncate">{siteName(s)}</span>
              <Select value={bySite[s] ?? ""} onChange={(x) => onBySite({ ...bySite, [s]: x })} options={options} className="w-36 py-1 text-xs" />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function BasicTab({ v, set, targetSites, today }: Props) {
  const calcAge = v.ageFromBirthday ? ageOn(v.birthday, today) : null;

  return (
    <div className="space-y-4">
      <Card title="公開状態">
        <div className="py-2">
          <Switch checked={v.isPublished} onChange={(x) => set("isPublished", x)} label={v.isPublished ? "公開中" : "非公開"} />
        </div>
      </Card>

      <Card title="基本">
        <Row label="女性名" level="必須">
          <TextInput value={v.name} onChange={(x) => set("name", x)} max={TEXT_MAX.name} />
        </Row>
        <Row label="カタカナ" level="必須">
          <TextInput value={v.kana} onChange={(x) => set("kana", x)} max={TEXT_MAX.kana} />
        </Row>
        <Row label="ひらがな" level="必須">
          <TextInput value={v.hiragana} onChange={(x) => set("hiragana", x)} max={TEXT_MAX.hiragana} />
        </Row>
        <Row label="ローマ字" level="推奨">
          <TextInput value={v.romaji} onChange={(x) => set("romaji", x)} max={TEXT_MAX.romaji} placeholder="Rian Momose" />
        </Row>
        <Row label="入店日" level="推奨">
          <div className="flex flex-wrap items-center gap-4">
            <input type="date" value={v.joinedOn} onChange={(e) => set("joinedOn", e.target.value)} className="input" />
            <Switch checked={v.isNew} onChange={(x) => set("isNew", x)} label="新人に設定する" />
          </div>
        </Row>
        <Row label="年齢" level="必須">
          <div className="flex flex-wrap items-center gap-4">
            <NumInput value={calcAge ?? v.age} onChange={(x) => set("age", x)} unit="歳" />
            <Switch checked={v.ageFromBirthday} onChange={(x) => set("ageFromBirthday", x)} label={<span className="text-xs text-zinc-400">生年月日と連動させる</span>} />
          </div>
        </Row>
        <Row label="生年月日" level="推奨" note={v.birthday ? `星座：${zodiacOf(v.birthday) || "-"}` : undefined}>
          <input type="date" value={v.birthday} onChange={(e) => set("birthday", e.target.value)} className="input" />
        </Row>
      </Card>

      <Card title="3サイズなど">
        <Row label="スリーサイズ" level="必須">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-zinc-400">B</span>
            <NumInput value={v.bust} onChange={(x) => set("bust", x)} />
            <Select value={v.cup} onChange={(x) => set("cup", x)} options={CUPS} empty="カップ" className="w-24" />
            <span className="text-sm text-zinc-400">W</span>
            <NumInput value={v.waist} onChange={(x) => set("waist", x)} />
            <span className="text-sm text-zinc-400">H</span>
            <NumInput value={v.hip} onChange={(x) => set("hip", x)} />
          </div>
        </Row>
        <Row label="身長・体重" level="必須" note="身長は必須、体重は任意">
          <div className="flex flex-wrap items-center gap-4">
            <NumInput value={v.height} onChange={(x) => set("height", x)} unit="cm" />
            <NumInput value={v.weight} onChange={(x) => set("weight", x)} unit="kg" />
          </div>
        </Row>
        <Row label="血液型" level="推奨">
          <Select value={v.bloodType} onChange={(x) => set("bloodType", x)} options={BLOOD_TYPES} className="w-32" />
        </Row>
        <Row label="スタイル">
          <PerSite
            value={v.style}
            bySite={v.styleBySite}
            options={STYLES}
            sites={targetSites}
            onValue={(x) => set("style", x)}
            onBySite={(x) => set("styleBySite", x)}
          />
        </Row>
        <Row label="タイプ">
          <PerSite
            value={v.castType}
            bySite={v.typeBySite}
            options={CAST_TYPES}
            sites={targetSites}
            onValue={(x) => set("castType", x)}
            onBySite={(x) => set("typeBySite", x)}
          />
        </Row>
      </Card>

      <Card title="キャッチコピー・ショートコメント">
        <Row label="キャッチコピー" level="推奨" note="10文字まで">
          <TextInput value={v.catchCopy} onChange={(x) => set("catchCopy", x)} max={TEXT_MAX.catchCopy} />
        </Row>
        <Row label="ショートコメント" level="必須" note="20文字まで">
          <TextInput value={v.shortComment} onChange={(x) => set("shortComment", x)} max={TEXT_MAX.shortComment} />
        </Row>
      </Card>

      <Card title="プロフィール">
        {PROFILE_TEXTS.map((f) =>
          Number.isFinite(f.max) ? (
            <Row key={f.key} label={f.label} level="推奨">
              <TextInput
                value={v[f.key]}
                onChange={(x) => set(f.key, x)}
                max={f.max}
                placeholder={f.key === "zodiac" && v.birthday ? zodiacOf(v.birthday) : undefined}
              />
            </Row>
          ) : (
            <Row key={f.key} label={f.label} level="推奨">
              <div className="flex items-start gap-2">
                <textarea value={v[f.key]} onChange={(e) => set(f.key, e.target.value)} rows={2} className="input w-full" />
                <Counter value={v[f.key]} />
              </div>
            </Row>
          ),
        )}
        <Row label="お酒">
          <Seg value={v.drinks} onChange={(x) => set("drinks", x)} options={["飲む", "飲まない"]} />
        </Row>
        <Row label="タバコ">
          <Seg value={v.smokes} onChange={(x) => set("smokes", x)} options={["吸う", "吸わない"]} />
        </Row>
        <Row label="顔出し">
          <Seg value={v.showFace} onChange={(x) => set("showFace", x)} options={["設定する", "設定しない"]} />
        </Row>
        <Row label="携帯メールアドレス">
          <TextInput type="email" value={v.mobileEmail} onChange={(x) => set("mobileEmail", x)} />
        </Row>
        <Row label="PCメールアドレス">
          <TextInput type="email" value={v.pcEmail} onChange={(x) => set("pcEmail", x)} />
        </Row>
      </Card>
    </div>
  );
}
