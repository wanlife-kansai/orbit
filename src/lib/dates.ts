// 日本時間で日付を扱うための小さな道具

const JST = 9 * 60 * 60 * 1000;

/** 日本時間の「今」を、UTCのフィールドで読める Date にして返す */
export function nowJst(now = new Date()) {
  return new Date(now.getTime() + JST);
}

export function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** 営業日（切り替わり時刻より前は前日扱い） */
export function businessDate(dayChangeHour: number, now = new Date()) {
  const j = nowJst(now);
  j.setUTCHours(j.getUTCHours() - dayChangeHour);
  return ymd(j);
}

export function addDays(date: string, n: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
}

/** その日を含む週の月曜日 */
export function mondayOf(date: string) {
  const d = new Date(date + "T00:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // 月=0
  return addDays(date, -dow);
}

const WD = ["日", "月", "火", "水", "木", "金", "土"];
export function labelMd(date: string) {
  const d = new Date(date + "T00:00:00Z");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WD[d.getUTCDay()]})`;
}

/** 営業日の時刻 HH:MM を「営業日0時からの分」に（切り替わり時刻より前は翌日扱い） */
export function minutesInBusinessDay(hhmm: string, dayChangeHour: number) {
  const [h, m] = hhmm.split(":").map(Number);
  let min = h * 60 + m;
  if (h < dayChangeHour) min += 24 * 60;
  return min;
}

/** いまが営業日0時から何分か */
export function nowMinutesInBusinessDay(dayChangeHour: number, now = new Date()) {
  const j = nowJst(now);
  let min = j.getUTCHours() * 60 + j.getUTCMinutes();
  if (j.getUTCHours() < dayChangeHour) min += 24 * 60;
  return min;
}

/** 表示用：翌00:00 のように表記 */
export function fmtTime(hhmm: string, dayChangeHour: number) {
  if (!hhmm) return "";
  const [h] = hhmm.split(":").map(Number);
  return h < dayChangeHour ? `翌${hhmm}` : hhmm;
}
