/**
 * コンテンツ更新で使える「枠」の一覧（Mr.Venrey のコンテンツ一覧 137件を 2026-11-20 に写したもの）。
 * driver がある枠は ORBIT から実際に投稿できます。ない枠は「接続準備中」として予定だけ組めます。
 */
export type CatalogItem = { site: string; slot: string; label: string; kind: string; driver?: string };

export const KINDS = ["速報", "上位化", "イベント", "割引", "即姫", "写メ", "求人", "その他"] as const;

/** sites.ts の SITES にない（求人などの）サイト */
export const EXTRA_SITES: { code: string; name: string }[] = [
  {
    "code": "himechannel",
    "name": "HIME CHANNEL"
  },
  {
    "code": "kirala",
    "name": "Kirala【キラーラ】"
  },
  {
    "code": "qpuri",
    "name": "Qプリ"
  },
  {
    "code": "r30",
    "name": "R-30.net"
  },
  {
    "code": "girlsheaven",
    "name": "ガールズヘブン（求人）"
  },
  {
    "code": "juliet",
    "name": "ジュリエ（求人）"
  },
  {
    "code": "jobheaven",
    "name": "ジョブヘブン【メンズヘブン】（求人）"
  },
  {
    "code": "hajimete",
    "name": "はじめての風俗アルバイト（求人）"
  },
  {
    "code": "vanilla",
    "name": "バニラ（求人）"
  },
  {
    "code": "purejo",
    "name": "ぴゅあじょ（求人）"
  },
  {
    "code": "mensvanilla",
    "name": "メンズバニラ（求人）"
  },
  {
    "code": "cocoa",
    "name": "駅ちか！風俗求人ココア（求人）"
  },
  { "code": "30baito", "name": "30からの風俗アルバイト【関西版】（求人）" },
  { "code": "ctiv2", "name": "CTIv2" },
  { "code": "fdc", "name": "風俗データセンター（まるごとHP）" }
];

export const CATALOG: CatalogItem[] = [
 // 2026-11-22 追加：快楽園のVenreyにあってORBITになかった枠
 { "site": "30baito", "slot": "s1", "label": "(急募コメント)【有料】", "kind": "求人" },
 { "site": "30baito", "slot": "s2", "label": "(上位表示ボタン)【有料】", "kind": "上位化" },
 { "site": "30baito", "slot": "s3", "label": "(上位表示ボタン-質問箱特典)【有料】", "kind": "上位化" },
 { "site": "ctiv2", "slot": "s1", "label": "【出勤更新のみ】", "kind": "その他" },
 { "site": "himechoku", "slot": "s1", "label": "【女性登録のみ】", "kind": "その他" },
 { "site": "shabi", "slot": "s1", "label": "【女性登録のみ】", "kind": "その他" },
 {
  "site": "fuweb",
  "slot": "s1",
  "label": "(イベント/割引)",
  "kind": "イベント"
 },
 {
  "site": "fuweb",
  "slot": "s2",
  "label": "(検索順位更新)",
  "kind": "上位化"
 },
 {
  "site": "fuweb",
  "slot": "s3",
  "label": "(写メ日記)",
  "kind": "写メ"
 },
 {
  "site": "fuweb",
  "slot": "s4",
  "label": "(新着ニュース)",
  "kind": "速報"
 },
 {
  "site": "fuweb",
  "slot": "s5",
  "label": "(即ヒメ)",
  "kind": "即姫"
 },
 {
  "site": "fuweb",
  "slot": "s6",
  "label": "(投稿動画)",
  "kind": "上位化"
 },
 {
  "site": "himechannel",
  "slot": "s1",
  "label": "(クーポン)",
  "kind": "割引"
 },
 {
  "site": "himechannel",
  "slot": "s2",
  "label": "(今すぐ遊べる)【一括更新専用】",
  "kind": "即姫"
 },
 {
  "site": "himechannel",
  "slot": "s3",
  "label": "(店舗投稿)",
  "kind": "その他"
 },
 {
  "site": "kakubutsu",
  "slot": "s1",
  "label": "(お知らせ)",
  "kind": "速報"
 },
 {
  "site": "kakubutsu",
  "slot": "s2",
  "label": "(割引チケット)",
  "kind": "割引"
 },
 {
  "site": "kakubutsu",
  "slot": "s3",
  "label": "(即ヒメ)",
  "kind": "即姫"
 },
 {
  "site": "kirala",
  "slot": "s1",
  "label": "(更新情報)",
  "kind": "上位化"
 },
 {
  "site": "qpuri",
  "slot": "s1",
  "label": "(リアルタイム速報)",
  "kind": "速報"
 },
 {
  "site": "qpuri",
  "slot": "s2",
  "label": "(順位アップ-出稼ぎ特集)",
  "kind": "その他"
 },
 {
  "site": "qpuri",
  "slot": "s3",
  "label": "(順位アップ-人妻・熟女特集)",
  "kind": "その他"
 },
 {
  "site": "qpuri",
  "slot": "s4",
  "label": "(順位アップ-即日体験入店特集)",
  "kind": "その他"
 },
 {
  "site": "qpuri",
  "slot": "s5",
  "label": "(順位アップ-未経験特集)",
  "kind": "その他"
 },
 {
  "site": "r30",
  "slot": "s1",
  "label": "(R-30特典)",
  "kind": "その他"
 },
 {
  "site": "r30",
  "slot": "s2",
  "label": "(店長NEWS)",
  "kind": "速報"
 },
 {
  "site": "agaru",
  "slot": "s1",
  "label": "(上位表示)",
  "kind": "上位化"
 },
 {
  "site": "agaru",
  "slot": "s2",
  "label": "(新着)",
  "kind": "速報"
 },
 {
  "site": "official",
  "slot": "s1",
  "label": "(イベント)",
  "kind": "イベント"
 },
 {
  "site": "official",
  "slot": "s2",
  "label": "(ニュース)",
  "kind": "速報"
 },
 {
  "site": "girlsheaven",
  "slot": "s1",
  "label": "(お店検索表示順アップ)",
  "kind": "上位化"
 },
 {
  "site": "girlsheaven",
  "slot": "s2",
  "label": "(求人)",
  "kind": "求人"
 },
 {
  "site": "girlsheaven",
  "slot": "s3",
  "label": "(先輩ボイス(旧))",
  "kind": "その他"
 },
 {
  "site": "girlsheaven",
  "slot": "s4",
  "label": "(店長ブログ)",
  "kind": "その他"
 },
 {
  "site": "cityheaven",
  "slot": "s1",
  "label": "(ヘブン更新ボタン)",
  "kind": "上位化"
 },
 {
  "site": "cityheaven",
  "slot": "s2",
  "label": "(ポッキリ)",
  "kind": "割引"
 },
 {
  "site": "cityheaven",
  "slot": "s3",
  "label": "(写メ日記)",
  "kind": "写メ"
 },
 {
  "site": "cityheaven",
  "slot": "s4",
  "label": "(即ヒメ登録)【1人ずつ更新】",
  "kind": "即姫"
 },
 {
  "site": "cityheaven",
  "slot": "s5",
  "label": "(即ヒメ登録)【全員同時更新】",
  "kind": "即姫"
 },
 {
  "site": "cityheaven",
  "slot": "s6",
  "label": "(直送便/プラチナメール)",
  "kind": "速報"
 },
 {
  "site": "juliet",
  "slot": "s1",
  "label": "(急募)",
  "kind": "速報"
 },
 {
  "site": "jobheaven",
  "slot": "s1",
  "label": "(お店検索表示順アップ)",
  "kind": "上位化"
 },
 {
  "site": "jobheaven",
  "slot": "s2",
  "label": "(求人ムービー)",
  "kind": "求人"
 },
 {
  "site": "jobheaven",
  "slot": "s3",
  "label": "(先輩の声)",
  "kind": "その他"
 },
 {
  "site": "jobheaven",
  "slot": "s4",
  "label": "(店長ブログ)",
  "kind": "その他"
 },
 {
  "site": "deli_japan",
  "slot": "s1",
  "label": "(イベント(フリーテキスト))-1枚目を更新",
  "kind": "イベント"
 },
 {
  "site": "deli_japan",
  "slot": "s2",
  "label": "(イベント(フリーテキスト))-2枚目を更新",
  "kind": "イベント"
 },
 {
  "site": "deli_japan",
  "slot": "s3",
  "label": "(イベント(フリーテキスト))-3枚目を更新",
  "kind": "イベント"
 },
 {
  "site": "deli_japan",
  "slot": "s4",
  "label": "(クーポン券)-1枚目を更新",
  "kind": "割引"
 },
 {
  "site": "deli_japan",
  "slot": "s5",
  "label": "(クーポン券)-2枚目を更新",
  "kind": "割引"
 },
 {
  "site": "deli_japan",
  "slot": "s6",
  "label": "(クーポン券)-3枚目を更新",
  "kind": "割引"
 },
 {
  "site": "deli_japan",
  "slot": "s7",
  "label": "(看板娘情報)",
  "kind": "その他"
 },
 {
  "site": "deli_japan",
  "slot": "s8",
  "label": "(写メ投稿)",
  "kind": "写メ"
 },
 {
  "site": "deli_japan",
  "slot": "s9",
  "label": "(即ヒメ)",
  "kind": "即姫"
 },
 {
  "site": "deli_japan",
  "slot": "s10",
  "label": "(即ヒメ)【複数女性を更新】",
  "kind": "即姫"
 },
 {
  "site": "deli_japan",
  "slot": "s11",
  "label": "(店長オススメ)",
  "kind": "その他"
 },
 {
  "site": "deli_japan",
  "slot": "s12",
  "label": "(店舗速報)",
  "kind": "速報"
 },
 {
  "site": "deli_town",
  "slot": "s1",
  "label": "(お知らせ)",
  "kind": "速報"
 },
 {
  "site": "deli_town",
  "slot": "s2",
  "label": "(タイトル画像(店舗バナー))",
  "kind": "その他"
 },
 {
  "site": "deli_town",
  "slot": "s3",
  "label": "(割引特典)",
  "kind": "割引"
 },
 {
  "site": "deli_town",
  "slot": "s4",
  "label": "(写メ日記)",
  "kind": "写メ"
 },
 {
  "site": "deli_town",
  "slot": "s5",
  "label": "(待機情報-ピックアップ)【1人ずつ更新】【有料】",
  "kind": "即姫"
 },
 {
  "site": "deli_town",
  "slot": "s6",
  "label": "(待機情報-ピックアップ)【全員同時更新】【有料】",
  "kind": "即姫"
 },
 {
  "site": "deli_town",
  "slot": "s7",
  "label": "(待機情報-待機中に設定)",
  "kind": "即姫"
 },
 {
  "site": "deli_town",
  "slot": "s8",
  "label": "(特設コンテンツ)",
  "kind": "速報"
 },
 {
  "site": "hajimete",
  "slot": "s1",
  "label": "(一括上位表示)【有料】",
  "kind": "上位化"
 },
 {
  "site": "hajimete",
  "slot": "s2",
  "label": "(一括上位表示-質問箱特典)【有料】",
  "kind": "上位化"
 },
 {
  "site": "vanilla",
  "slot": "s1",
  "label": "(店長ブログ)",
  "kind": "その他"
 },
 {
  "site": "purejo",
  "slot": "s1",
  "label": "(お店紹介動画)",
  "kind": "その他"
 },
 {
  "site": "purejo",
  "slot": "s2",
  "label": "(急募速報)",
  "kind": "速報"
 },
 {
  "site": "purejo",
  "slot": "s3",
  "label": "(店長NEWS)",
  "kind": "求人"
 },
 {
  "site": "purelovers",
  "slot": "s1",
  "label": "(お店イチオシの女の子)",
  "kind": "その他"
 },
 {
  "site": "purelovers",
  "slot": "s2",
  "label": "(ランキング管理)",
  "kind": "その他"
 },
 {
  "site": "purelovers",
  "slot": "s3",
  "label": "(写メ日記)",
  "kind": "写メ"
 },
 {
  "site": "purelovers",
  "slot": "s4",
  "label": "(即ヒメ)【1人ずつ更新】",
  "kind": "即姫"
 },
 {
  "site": "purelovers",
  "slot": "s5",
  "label": "(即ヒメ)【全員同時更新】",
  "kind": "即姫"
 },
 {
  "site": "purelovers",
  "slot": "s6",
  "label": "(速報)",
  "kind": "速報"
 },
 {
  "site": "purelovers",
  "slot": "s7",
  "label": "(体験入店速報)",
  "kind": "その他"
 },
 {
  "site": "purelovers",
  "slot": "s8",
  "label": "(直送メール管理)",
  "kind": "その他"
 },
 {
  "site": "purelovers",
  "slot": "s9",
  "label": "(投稿！生動画-上位化)",
  "kind": "上位化"
 },
 {
  "site": "purelovers",
  "slot": "s10",
  "label": "(風俗グラビア-上位化)",
  "kind": "上位化"
 },
 {
  "site": "fugal104",
  "slot": "s1",
  "label": "(ピックアップ)",
  "kind": "その他"
 },
 {
  "site": "fugal104",
  "slot": "s2",
  "label": "(割引情報)",
  "kind": "割引"
 },
 {
  "site": "fugal104",
  "slot": "s3",
  "label": "(速報)",
  "kind": "速報"
 },
 {
  "site": "fucolle",
  "slot": "s1",
  "label": "(お知らせ)",
  "kind": "速報"
 },
 {
  "site": "fucolle",
  "slot": "s2",
  "label": "(ただ今待機中)",
  "kind": "即姫"
 },
 {
  "site": "maniacs",
  "slot": "s1",
  "label": "(イベント)",
  "kind": "イベント"
 },
 {
  "site": "maniacs",
  "slot": "s2",
  "label": "(写メ日記)",
  "kind": "写メ"
 },
 {
  "site": "maniacs",
  "slot": "s3",
  "label": "(上位表示ボタン)",
  "kind": "上位化"
 },
 {
  "site": "maniacs",
  "slot": "s4",
  "label": "(待機設定)【一括更新専用】",
  "kind": "即姫"
 },
 {
  "site": "manzoku",
  "slot": "s1",
  "label": "(今すぐ入れるGAL)【有料】",
  "kind": "即姫"
 },
 {
  "site": "manzoku",
  "slot": "s2",
  "label": "(最新情報)【有料】",
  "kind": "速報"
 },
 {
  "site": "manzoku",
  "slot": "s3",
  "label": "(写メ日記)【有料】",
  "kind": "写メ"
 },
 {
  "site": "manzoku",
  "slot": "s4",
  "label": "(店長コメント)",
  "kind": "その他"
 },
 {
  "site": "manzoku",
  "slot": "s5",
  "label": "(動画管理-上位表示)",
  "kind": "その他"
 },
 {
  "site": "mensvanilla",
  "slot": "s1",
  "label": "(スタッフブログ)",
  "kind": "その他"
 },
 {
  "site": "cocoa",
  "slot": "s1",
  "label": "(店長ブログ)",
  "kind": "その他"
 },
 {
  "site": "cocoa",
  "slot": "s2",
  "label": "(動画投稿)",
  "kind": "その他"
 },
 {
  "site": "ekichika",
  "slot": "s1",
  "label": "(ニュース)",
  "kind": "速報"
 },
 {
  "site": "ekichika",
  "slot": "s2",
  "label": "(写メ日記)",
  "kind": "写メ"
 },
 {
  "site": "ekichika",
  "slot": "s3",
  "label": "(上位表示)",
  "kind": "上位化"
 },
 {
  "site": "ekichika",
  "slot": "s4",
  "label": "(即ヒメ)",
  "kind": "即姫"
 },
 {
  "site": "ekichika",
  "slot": "s5",
  "label": "(動画投稿)",
  "kind": "その他"
 },
 {
  "site": "mieccha",
  "slot": "s1",
  "label": "(アク禁・発言抑止-再設定)",
  "kind": "その他"
 },
 {
  "site": "mieccha",
  "slot": "s2",
  "label": "(ライブチャットNo.1設定アピールタイム)",
  "kind": "上位化"
 },
 {
  "site": "mieccha",
  "slot": "s3",
  "label": "(速報・新着情報)",
  "kind": "速報"
 },
 {
  "site": "mieccha",
  "slot": "s4",
  "label": "(待機設定)",
  "kind": "即姫"
 },
 {
  "site": "mieccha",
  "slot": "s5",
  "label": "(店内ランキング管理)",
  "kind": "その他"
 },
 {
  "site": "mieccha",
  "slot": "s6",
  "label": "(特典情報)",
  "kind": "割引"
 },
 {
  "site": "kuchikomi",
  "slot": "s1",
  "label": "(すぐヒメ！)【選択女性を更新】",
  "kind": "即姫"
 },
 {
  "site": "kuchikomi",
  "slot": "s2",
  "label": "(すぐヒメ！)【有料】",
  "kind": "即姫"
 },
 {
  "site": "kuchikomi",
  "slot": "s3",
  "label": "(すぐヒメ！)【有料】【1人ずつ更新】",
  "kind": "即姫"
 },
 {
  "site": "kuchikomi",
  "slot": "s4",
  "label": "(ヒメ割！)",
  "kind": "割引"
 },
 {
  "site": "kuchikomi",
  "slot": "s5",
  "label": "(ヒメ割！)【複数女性を更新】",
  "kind": "割引"
 },
 {
  "site": "kuchikomi",
  "slot": "s6",
  "label": "(ヒメ日記)",
  "kind": "写メ"
 },
 {
  "site": "kuchikomi",
  "slot": "s7",
  "label": "(割引・イベント)",
  "kind": "割引"
 },
 {
  "site": "kuchikomi",
  "slot": "s8",
  "label": "(局割！)",
  "kind": "割引"
 },
 {
  "site": "kuchikomi",
  "slot": "s9",
  "label": "(速報！)",
  "kind": "速報"
 },
 {
  "site": "kuchikomi",
  "slot": "s10",
  "label": "(店長イチオシ)",
  "kind": "その他"
 },
 {
  "site": "atarijo",
  "slot": "s1",
  "label": "(PR文編集)",
  "kind": "その他"
 },
 {
  "site": "atarijo",
  "slot": "s2",
  "label": "(クーポンTOP)",
  "kind": "割引"
 },
 {
  "site": "atarijo",
  "slot": "s3",
  "label": "(当たり嬢レポート限定特典)【無料】",
  "kind": "割引"
 },
 {
  "site": "atarijo",
  "slot": "s4",
  "label": "(当たり嬢レポート限定特典)【有料】",
  "kind": "割引"
 },
 {
  "site": "fuzokudx",
  "slot": "s1",
  "label": "(お店速報)",
  "kind": "速報",
  "driver": "fuzokudx.news"
 },
 {
  "site": "fuzokudx",
  "slot": "s2",
  "label": "(ランキング)",
  "kind": "その他"
 },
 {
  "site": "fuzokudx",
  "slot": "s3",
  "label": "(今すぐ娘)【一括更新専用】",
  "kind": "即姫"
 },
 {
  "site": "fuzokudx",
  "slot": "s4",
  "label": "(写メ日記)",
  "kind": "写メ"
 },
 {
  "site": "fuzokudx",
  "slot": "s5",
  "label": "(投稿動画-再投稿)",
  "kind": "その他"
 },
 {
  "site": "fuzoku_japan",
  "slot": "s1",
  "label": "(イベント(フリーテキスト))-1枚目を更新",
  "kind": "イベント"
 },
 {
  "site": "fuzoku_japan",
  "slot": "s2",
  "label": "(クーポン券)-1枚目を更新",
  "kind": "割引"
 },
 {
  "site": "fuzoku_japan",
  "slot": "s3",
  "label": "(ピックアップガールズ)",
  "kind": "その他"
 },
 {
  "site": "fuzoku_japan",
  "slot": "s4",
  "label": "(ミスじゃぱん)",
  "kind": "その他"
 },
 {
  "site": "fuzoku_japan",
  "slot": "s5",
  "label": "(今から遊べる女の子)",
  "kind": "即姫"
 },
 {
  "site": "fuzoku_japan",
  "slot": "s6",
  "label": "(今から遊べる女の子)【複数女性を更新】",
  "kind": "即姫"
 },
 {
  "site": "fuzoku_japan",
  "slot": "s7",
  "label": "(店舗速報)",
  "kind": "速報"
 },
 {
  "site": "fuzoku_japan",
  "slot": "s8",
  "label": "(動画投稿)",
  "kind": "その他"
 },
 {
  "site": "yorudeli",
  "slot": "s1",
  "label": "(速報・新着情報)",
  "kind": "速報"
 }
];

export const catalogItem = (site: string, slot: string) => CATALOG.find((c) => c.site === site && c.slot === slot);
