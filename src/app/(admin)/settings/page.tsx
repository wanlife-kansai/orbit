import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getShop, SHOP_ID } from "@/lib/shop";
import { PageHeader } from "@/components/PageHeader";

async function save(fd: FormData) {
  "use server";
  const h = Number(fd.get("dayChangeHour"));
  await db
    .update(schema.shops)
    .set({
      name: String(fd.get("name") ?? "").trim() || "店舗",
      officialUrl: String(fd.get("officialUrl") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      dayChangeHour: Number.isInteger(h) && h >= 0 && h <= 12 ? h : 3,
    })
    .where(eq(schema.shops.id, SHOP_ID));
  revalidatePath("/", "layout");
}

export default async function SettingsPage() {
  const shop = await getShop();
  return (
    <>
      <PageHeader title="店舗設定" />
      <form action={save} className="card max-w-xl space-y-4 p-5">
        <div>
          <label className="label">店舗名</label>
          <input name="name" defaultValue={shop.name} className="input w-full" />
        </div>
        <div>
          <label className="label">公式サイトURL</label>
          <input name="officialUrl" type="url" defaultValue={shop.officialUrl} className="input w-full" placeholder="https://" />
        </div>
        <div>
          <label className="label">連絡用メールアドレス</label>
          <input name="email" type="email" defaultValue={shop.email} className="input w-full" />
        </div>
        <div>
          <label className="label">営業日の切り替え時刻</label>
          <select name="dayChangeHour" defaultValue={shop.dayChangeHour} className="input">
            {Array.from({ length: 13 }, (_, h) => (
              <option key={h} value={h}>{h}:00</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">この時刻より前は前日の営業として扱います（例：3:00 なら深夜2時は前日）。ポータルごとの切り替え時刻は配信側で合わせます。</p>
        </div>
        <button className="btn-primary">保存する</button>
      </form>
    </>
  );
}
