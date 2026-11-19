/**
 * 連動先サイトの一覧と、サイトごとの専用項目（女性編集 →「各サイト項目」タブ）。
 * Mr.Venrey の「各サイト項目」を 2026-11-19 に確認して写したものです。
 * 新しいサイトに対応するときは、ここに足すだけで編集画面に項目が出ます。
 *
 * 値は casts.site_fields に { [サイトのcode]: { [項目のkey]: 値 } } で保存します。
 * 「複数サイト共通」「インバウンド」は site_fields の "common" / "inbound" に入ります。
 */

export type FieldDef =
  | { key: string; label: string; type: "text"; max?: number; placeholder?: string; note?: string }
  | { key: string; label: string; type: "textarea"; max?: number; rows?: number; note?: string }
  | { key: string; label: string; type: "select"; options: readonly string[]; note?: string }
  | { key: string; label: string; type: "multi"; groups: readonly { title?: string; options: readonly string[] }[]; max?: number; note?: string }
  | { key: string; label: string; type: "date"; note?: string };

export type SiteDef = {
  code: string;
  name: string;
  /** 日本語サイト / インバウンド */
  level?: "必須" | "推奨";
  fields: FieldDef[];
};

/** 連動先として選べるサイト（Venrey の対応サイトのうち、快楽園で使っていた22サイト＋公式） */
export const SITES: { code: string; name: string; note?: string }[] = [
  { code: "official", name: "オフィシャル（公式サイト）" },
  { code: "fuweb", name: "Fu-WEB" },
  { code: "kakubutsu", name: "kaku-butsu【カクブツSOD風俗調査団】" },
  { code: "oeg_en", name: "Osaka Erotic Guide【英語版】", note: "別名にローマ字入力推奨" },
  { code: "agaru", name: "アガる風俗" },
  { code: "cityheaven", name: "シティヘブンネット" },
  { code: "deli_japan", name: "デリヘルじゃぱん！" },
  { code: "deli_town", name: "デリヘルタウン" },
  { code: "himechoku", name: "ヒメチョク" },
  { code: "purelovers", name: "ぴゅあらば" },
  { code: "fugal104", name: "フーギャル104" },
  { code: "fucolle", name: "フーコレ" },
  { code: "maniacs", name: "マニアックスグループ" },
  { code: "manzoku", name: "マンゾクネット" },
  { code: "ekichika", name: "駅ちか人気！風俗ランキング" },
  { code: "mieccha", name: "見えちゃっとTV" },
  { code: "kuchikomi", name: "口コミ風俗情報局", note: "プランによる" },
  { code: "shabi", name: "写―ビー" },
  { code: "atarijo", name: "当たり嬢レポート", note: "編集時はスリーサイズ以外" },
  { code: "fuzokudx", name: "風俗DX" },
  { code: "fuzoku_japan", name: "風俗じゃぱん！" },
  { code: "yorudeli", name: "夜デリ" },
];
export const siteName = (code: string) => SITES.find((s) => s.code === code)?.name ?? code;

/** Q&A をサイト別に持てるサイト */
export const QA_SITES = ["deli_town", "kuchikomi", "cityheaven", "deli_japan", "manzoku", "ekichika", "fuzokudx", "fuzoku_japan"];

const YESNO = ["設定しない", "設定する"] as const;
const SET_UNSET = ["未選択", "設定", "解除"] as const;
const TAG_VIEW = ["タグを表示", "タグを表示しない"] as const;

/* ---- 複数サイト共通 ---- */
export const COMMON_FIELDS: (FieldDef & { sites: string[] })[] = [
  { key: "profileUrl", label: "女の子プロフィールURL", type: "text", sites: ["kakubutsu", "atarijo"] },
  { key: "xUrl", label: "X(Twitter)URL", type: "text", sites: ["kakubutsu", "official", "deli_japan", "maniacs", "fuzoku_japan"] },
  { key: "instagramUrl", label: "InstagramURL", type: "text", sites: ["kakubutsu", "official", "deli_japan", "maniacs", "fuzoku_japan"] },
  { key: "blueskyUrl", label: "BlueskyURL", type: "text", sites: ["kakubutsu", "official", "deli_japan", "maniacs", "fuzoku_japan"] },
  { key: "personality", label: "性格", type: "text", sites: ["yorudeli", "mieccha", "fuzoku_japan"] },
  { key: "prevJob", label: "前職", type: "text", sites: ["yorudeli", "mieccha", "fuzoku_japan"] },
];

/* ---- インバウンド ---- */
export const INBOUND_FIELDS: FieldDef[] = [
  { key: "show", label: "インバウンド向けサイトへの表示", type: "select", options: ["更新しない", "表示する", "表示しない"] },
  { key: "commentEn", label: "コメント(英語)", type: "textarea", rows: 4 },
  { key: "langZh", label: "対応可能言語-中国語", type: "select", options: YESNO },
  { key: "langEn", label: "対応可能言語-英語", type: "select", options: YESNO },
  { key: "langJa", label: "対応可能言語-日本語", type: "select", options: YESNO },
  { key: "langKo", label: "対応可能言語-韓国語", type: "select", options: YESNO },
  { key: "nameEn", label: "【廃止予定】女性名(英語)", type: "text", note: "ローマ字推奨" },
  { key: "yoasobiTitle", label: "フリースペースタイトル（YOASOBI Heaven）", type: "text", note: "設定有効時のみ" },
  { key: "yoasobiBody", label: "フリースペース本文（YOASOBI Heaven）", type: "textarea", rows: 5, note: "設定有効時のみ・HTML可" },
  { key: "levelEn", label: "言語LEVEL英語（YOASOBI Heaven）", type: "text", placeholder: "サイト側保持" },
  { key: "levelZh", label: "言語LEVEL中国語（YOASOBI Heaven）", type: "text", placeholder: "サイト側保持" },
  { key: "levelKo", label: "言語LEVEL韓国語（YOASOBI Heaven）", type: "text", placeholder: "サイト側保持" },
];

/* ---- 選択肢のリスト ---- */
const DJ_TAGS = [
  "人気TOP3", "プレミア", "店長オススメ", "未経験", "av女優", "素人", "写メ日記更新中", "動画公開中", "禁煙", "要予約", "顔出し",
  "メッセージあり", "ニューハーフ", "ハーフ", "タトゥーあり", "OL系", "アイドル系", "お姉さん系", "お嬢様", "ロリ系", "女子大生",
  "人妻系", "美少女系", "癒し系", "キャバ系", "ギャル系", "キレカワ系", "グラマー", "スレンダー", "セクシー", "萌え系", "カワイイ系",
  "キレイ系", "モデル系", "攻め(責め)好き", "受身好き", "愛嬌抜群", "ｲﾁｬｲﾁｬ好き", "おっとり", "清楚", "天然", "濃厚サービス",
  "ドM(ドエム)", "テクニシャン", "サービス抜群", "普通", "明るい", "甘えん坊", "ツンデレ", "恥ずかしがり屋", "人懐っこい", "エロい",
  "空気を読む", "オタク", "しっかり者", "アニメ声", "感度抜群", "ドS・女王様", "変態", "話し好き", "聞き上手", "ぽっちゃり",
  "ミニマム", "美乳", "美尻", "巨尻", "貧乳", "巨乳", "爆乳", "パイパン", "美肌", "美脚", "敏感", "色白", "高身長", "小柄", "黒髪",
  "乳首ピンク", "乳輪大きい", "ルックス抜群", "スタイル抜群", "潮吹き", "聖水", "黄金", "マット", "アナル", "パイズリ", "母乳", "痴女",
];

const EKI_ALL = [
  "no1", "no2", "no3", "プレミア", "店長オススメ", "素人", "未経験", "禁煙", "要予約", "顔出し", "アイドル系", "お姉さん系", "お嬢様",
  "可愛い系", "ロリ系", "ギャル系", "キレカワ", "美少女系", "綺麗系", "ハーフ", "グラマー", "スレンダー", "ぽっちゃり", "ミニマム",
  "美肌", "美脚", "色白", "スタイル抜群", "モデル系", "高身長", "低身長", "ﾀﾄｩｰ・刺青", "OL系", "女子大生", "キャバ系", "セクシー系",
  "癒し系", "清楚", "萌え系", "おっとり", "天然", "テクニシャン", "サービス抜群", "愛嬌抜群",
];
const EKI_HEALTH = [
  "av女優", "パイパン", "妊婦プレイ", "敏感", "攻め好き", "受身好き", "痴女", "濃厚サービス", "潮吹き", "ドM(ドエム)", "ドS(ドエス)",
  "母乳プレイ", "パイズリ", "ＡＦ可", "イラマチオ可", "3Ｐ可", "ごっくん", "アジアン", "ﾌﾞﾛﾝﾄﾞ・金髪", "ニューハーフ", "熟女系", "巨乳",
  "爆乳", "貧乳", "美乳", "巨尻", "美尻", "人妻系", "ｲﾁｬｲﾁｬ好き",
];
const EKI_SOAP = ["アジアン", "ﾌﾞﾛﾝﾄﾞ・金髪", "ニューハーフ", "熟女系", "巨乳", "爆乳", "貧乳", "美乳", "巨尻", "美尻", "人妻系", "ｲﾁｬｲﾁｬ好き"];
const EKI_ESTE = [
  "エステ経験者", "エステ未経験", "資格あり", "インテリ", "ツンデレ", "話し上手", "聞き上手", "リピート高確率", "好感度抜群", "礼儀正しい",
  "好奇心旺盛", "真面目", "マッサージが得意", "極液施術可能", "バリエーション豊富", "出張サービス可能", "丁寧な施術",
];
const EKI_GENRES = [...new Set([...EKI_ALL, ...EKI_HEALTH])];

const FJ_LOOKS = ["美乳", "乳輪大きい", "乳首ピンク", "美尻", "巨尻", "スレンダー", "セクシー", "グラマー", "ぽっちゃり", "メガぽっちゃり", "美肌", "色白", "色黒", "パイパン", "黒髪", "美脚"];
const FJ_PERSONALITY = ["明るい", "甘えん坊", "ツンデレ", "恥ずかしがり屋", "人懐っこい", "愛嬌抜群", "しっかり者", "話し好き", "聞き上手", "天然", "オタク", "おっとり", "ｲﾁｬｲﾁｬ好き"];
const FJ_TYPE = ["ロリ系", "ギャル系", "人妻系", "キレイ系", "カワイイ系", "モデル系", "美少女系", "癒し系", "キャバ系", "清楚", "アイドル系", "OL系", "お姉さん系", "萌え系", "お嬢様"];
const FJ_PLAY = ["黄金", "聖水", "マット", "アナル", "パイズリ", "潮吹き"];
const FJ_FEATURE = ["AV女優", "母乳", "ニューハーフ", "敏感", "感度抜群", "女子大生", "スタイル抜群", "ハーフ", "タトゥー", "素人", "変態", "痴女", "アニメ声", "未経験", "顔出し", "禁煙", "テクニシャン"];
const FJ_TAGS = [...new Set([...FJ_LOOKS, ...FJ_PERSONALITY, ...FJ_TYPE, ...FJ_PLAY, ...FJ_FEATURE])];

const SM_LEVELS = Array.from({ length: 11 }, (_, i) => `S:${10 - i} M:${i}`);

/* ---- サイトごとの専用項目（日本語サイト） ---- */
export const SITE_FIELDS: SiteDef[] = [
  {
    code: "cityheaven",
    name: "シティヘブンネット",
    level: "必須",
    fields: [
      { key: "entryRoute", label: "入店経路", type: "select", options: ["変更しない(未設定時は「その他」で登録)", "ガールズヘブン", "その他"] },
      { key: "photoRotation", label: "写真ローテーション", type: "select", options: YESNO },
      {
        key: "salesPoints",
        label: "セールスポイント",
        type: "multi",
        max: 12,
        groups: [
          { title: "体型", options: ["スレンダー", "ぷよっ子", "小柄", "長身", "普通", "グラマー", "ぽっちゃり"] },
          {
            title: "個性",
            options: ["素人", "巨乳", "美乳", "美脚", "美尻", "パイパン", "ギャル系", "モデル系", "現役学生", "セクシー女優", "ハーフ", "アニメ声", "黒髪", "ニューハーフ", "乳首ピンク", "乳輪大きい", "喫煙しない", "レズビアン"],
          },
          { title: "性格", options: ["明るい", "癒し系", "甘えん坊", "天然", "ツンデレ", "おっとり", "恥ずかしがり屋", "人懐っこい", "エロい", "空気を読む", "オタク", "しっかり者"] },
          {
            title: "プレイスタイル",
            options: ["ルックス抜群", "スタイル抜群", "サービス抜群", "感度抜群", "責め好き", "受身好き", "ア○ル", "マニア", "潮吹き", "ドM", "ドS・女王様", "変態", "話し好き", "聞き上手", "母乳", "パイズリ", "聖水", "黄金"],
          },
        ],
      },
    ],
  },
  {
    code: "deli_japan",
    name: "デリヘルじゃぱん！",
    level: "必須",
    fields: [
      { key: "tag1", label: "女の子タグ1", type: "select", options: ["", ...DJ_TAGS] },
      { key: "tag2", label: "女の子タグ2", type: "select", options: ["", ...DJ_TAGS] },
      { key: "tags", label: "女の子タグ(その他)", type: "multi", groups: [{ options: DJ_TAGS }] },
      { key: "trial", label: "体験入店設定", type: "select", options: SET_UNSET },
    ],
  },
  {
    code: "deli_town",
    name: "デリヘルタウン",
    level: "推奨",
    fields: [
      { key: "basicPlay", label: "基本プレイ", type: "textarea", rows: 6, note: "1行15文字以内、40行まで" },
      { key: "optionPlay", label: "オプションプレイ", type: "textarea", rows: 6, note: "1行15文字以内、40行まで" },
    ],
  },
  {
    code: "purelovers",
    name: "ぴゅあらば",
    level: "必須",
    fields: [
      { key: "industry", label: "業種絞り込み", type: "select", options: ["未設定", "ソープ", "ヘルス", "デリヘル", "ホテヘル", "ピンサロ", "エステ", "セクキャバ", "女性用風俗"] },
      { key: "smokingUpdate", label: "喫煙項目の更新有無", type: "select", options: ["更新する", "更新しない"] },
      { key: "drinks", label: "お酒", type: "select", options: ["基本項目の「お酒」を反映(「飲む」=「ほどほど」で更新)", "更新しない"] },
      { key: "newIconFrom", label: "新人アイコン表示開始日付", type: "date", note: "新人アイコンはサイト側で編集不可" },
      {
        key: "plays",
        label: "可能基本プレイ/可能オプション",
        type: "multi",
        groups: [
          {
            options: [
              "ディープキス", "全身リップ", "パイズリ", "手コキ", "足コキ", "尻コキ", "素股", "フェラ", "生フェラ", "玉舐め", "イラマチオ", "顔射",
              "口内発射", "ゴックン", "お掃除フェラ", "時間内発射無制限", "乳首舐め", "足舐め", "アナル舐め", "前立腺マッサージ", "睾丸マッサージ",
              "回春マッサージ", "亀頭責め", "強制射精", "男の潮吹き", "くすぐり", "母乳・授乳", "赤ちゃん・幼児プレイ", "痴漢", "擬似レイプ",
              "即尺", "3P", "マットプレイ", "ローションプレイ", "奴隷・調教", "医療プレイ", "セクハラ", "撮影", "オナニー鑑賞", "パンティー",
              "パンスト", "コスプレ", "ピンクローター", "バイブ", "電マ", "クンニ", "69", "指入れ", "潮吹き", "拘束・目隠し", "鼻フック",
              "隠語・言葉責め", "顔面騎乗", "ソフトSM", "剃毛", "聖水", "放尿", "スカトロ・浣腸", "AF", "フィスト", "ゲロ・嘔吐",
            ],
          },
        ],
      },
      { key: "subTags", label: "サブタグ", type: "textarea", rows: 4, note: "1行に1つ。上から順に表示。サイト側で付与されていない自動タグは無視されます" },
    ],
  },
  {
    code: "fucolle",
    name: "フーコレ",
    level: "推奨",
    fields: [
      {
        key: "appealPoints",
        label: "アピールポイント",
        type: "multi",
        max: 8,
        note: "通常掲載2個、上位掲載4個、最上位掲載6個、『極』掲載8個、その他掲載1個まで",
        groups: [
          {
            options: [
              "ノンスモーカー", "香水は不使用", "刺青なし", "パイパン", "昼職あり", "現役学生", "地元の娘", "キレイ系", "可愛い系", "癒し系",
              "ツンデレ", "甘えん坊", "業界未経験", "人妻", "シングル", "ＡＶ女優", "ハーフ", "攻め好き", "受け好き", "妊婦", "母乳",
              "出産歴なし", "彼氏なし", "ニューハーフ", "イメプレ可能", "連射可能", "ＳＭ可能", "ＡＦ可能", "前立腺可能", "３Ｐ可能",
              "障害者の利用可", "外国人の利用可", "女性客の利用可", "ギャル系", "黒ギャル", "セレブ系", "期間限定", "即尺", "マット可",
              "写メ撮影", "動画撮影",
            ],
          },
        ],
      },
    ],
  },
  {
    code: "ekichika",
    name: "駅ちか人気！風俗ランキング",
    level: "必須",
    fields: [
      { key: "industry", label: "業種絞り込み", type: "select", options: ["未設定", "デリヘル", "ホテヘル", "ヘルス", "風俗エステ", "ソープ", "ピンサロ", "メンズエステ"] },
      { key: "genre1", label: "ジャンル1(大)", type: "select", options: ["", ...EKI_GENRES] },
      { key: "genre2", label: "ジャンル2(大)", type: "select", options: ["", ...EKI_GENRES] },
      { key: "genre3", label: "ジャンル3(大)", type: "select", options: ["", ...EKI_GENRES] },
      {
        key: "genres",
        label: "ジャンル",
        type: "multi",
        max: 16,
        note: "ジャンル1〜3(大)とあわせて19個まで",
        groups: [
          { title: "すべての業種", options: EKI_ALL },
          { title: "デリヘル、ホテヘル、ヘルス、風俗エステ", options: EKI_HEALTH },
          { title: "ソープ、ピンサロ", options: EKI_SOAP },
          { title: "メンズエステ", options: EKI_ESTE },
        ],
      },
      { key: "options", label: "可能オプション", type: "text", max: 145 },
      { key: "newTrial", label: "新人・体験入店", type: "select", options: ["未選択", "新人", "体験入店", "体験入店＋新人"] },
      { key: "priority1", label: "優先タグ1", type: "select", options: ["", ...EKI_GENRES] },
      { key: "priority2", label: "優先タグ2", type: "select", options: ["", ...EKI_GENRES] },
      { key: "priority3", label: "優先タグ3", type: "select", options: ["", ...EKI_GENRES] },
      { key: "messageTitle", label: "お店からのメッセージ(メッセージタイトル)", type: "text", max: 80 },
    ],
  },
  {
    code: "mieccha",
    name: "見えちゃっとTV",
    level: "推奨",
    fields: [
      {
        key: "plays",
        label: "可能プレイ",
        type: "multi",
        groups: [
          {
            options: [
              "全身リップ", "ディープキス", "入浴プレイ", "ローションプレイ", "指入れ", "素股", "６９", "パイズリ", "玉舐め", "アナル舐め",
              "バイブ", "ローター", "電マ", "生フェラ", "即尺", "全身マッサージ", "前立腺マッサージ", "手コキ", "言葉責め", "パンスト",
              "オナニー鑑賞", "顔射", "聖水", "ＡＦ", "コスプレ", "ソフトＳＭ(Ｓ女)", "ソフトＳＭ(Ｍ女)", "ハードＳＭ(Ｓ女)", "ハードＳＭ(Ｍ女)",
              "３Ｐ", "連射ＯＫ",
            ],
          },
        ],
      },
    ],
  },
  {
    code: "fuzoku_japan",
    name: "風俗じゃぱん！",
    level: "必須",
    fields: [
      { key: "honshimei", label: "本指名料", type: "text" },
      { key: "honshimeiFromCourse", label: "本指名料：コース・料金設定で登録した金額を反映する", type: "select", options: YESNO },
      { key: "shimei", label: "指名料", type: "text" },
      { key: "shimeiFromCourse", label: "指名料：コース・料金設定で登録した金額を反映する", type: "select", options: YESNO },
      { key: "industry", label: "業種絞り込み", type: "select", options: ["未設定", "ソープ", "ヘルス", "デリヘル", "ホテヘル", "ピンサロ", "エステ"] },
      { key: "showHeight", label: "身長", type: "select", options: TAG_VIEW },
      { key: "showBust", label: "乳（サイズ）", type: "select", options: TAG_VIEW },
      { key: "showSm", label: "SM属性", type: "select", options: TAG_VIEW },
      { key: "tag1", label: "女の子タグ1", type: "select", options: ["", ...FJ_TAGS] },
      { key: "tag2", label: "女の子タグ2", type: "select", options: ["", ...FJ_TAGS] },
      { key: "looks", label: "ルックス", type: "multi", max: 5, groups: [{ options: FJ_LOOKS }] },
      { key: "personalityTags", label: "性格", type: "multi", max: 2, groups: [{ options: FJ_PERSONALITY }] },
      { key: "type", label: "タイプ", type: "multi", max: 1, groups: [{ options: FJ_TYPE }] },
      { key: "play", label: "プレイ", type: "multi", groups: [{ options: FJ_PLAY }] },
      { key: "features", label: "こだわり・特徴・個性", type: "multi", max: 2, groups: [{ options: FJ_FEATURE }] },
      { key: "smLevel", label: "S・M度チェック", type: "select", options: ["", ...SM_LEVELS] },
      { key: "trial", label: "体験入店設定", type: "select", options: SET_UNSET },
    ],
  },
];

export type SiteValues = Record<string, Record<string, string | string[]>>;
