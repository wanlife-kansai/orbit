import { NextResponse } from "next/server";
import { and, asc, eq, max } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentShopId } from "@/lib/shop";
import { PHOTO_MAX, THUMB_MAX } from "@/lib/castFields";
import { removeImage, saveImage } from "@/lib/storage";

const { castPhotos, casts } = schema;
type Ctx = { params: Promise<{ id: string }> };

async function castOf(ctx: Ctx) {
  const id = Number((await ctx.params).id);
  const [c] = await db.select({ id: casts.id }).from(casts).where(and(eq(casts.id, id), eq(casts.shopId, (await currentShopId()))));
  return c?.id ?? null;
}
const list = (castId: number) =>
  db.select().from(castPhotos).where(eq(castPhotos.castId, castId)).orderBy(asc(castPhotos.kind), asc(castPhotos.sortOrder), asc(castPhotos.id));

export async function GET(_req: Request, ctx: Ctx) {
  const castId = await castOf(ctx);
  if (!castId) return NextResponse.json({ error: "女性が見つかりません" }, { status: 404 });
  return NextResponse.json({ photos: await list(castId) });
}

/** 画像を追加（複数可）：form-data の files と kind（photo / thumb） */
export async function POST(req: Request, ctx: Ctx) {
  const castId = await castOf(ctx);
  if (!castId) return NextResponse.json({ error: "女性が見つかりません" }, { status: 404 });
  const fd = await req.formData();
  const kind = fd.get("kind") === "thumb" ? "thumb" : "photo";
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const limit = kind === "thumb" ? THUMB_MAX : PHOTO_MAX;
  const now = (await list(castId)).filter((p) => p.kind === kind).length;
  if (now + files.length > limit) {
    return NextResponse.json({ error: `${kind === "thumb" ? "サムネイル" : "画像"}は${limit}枚までです（残り${Math.max(0, limit - now)}枚）` }, { status: 400 });
  }
  const [{ m }] = await db.select({ m: max(castPhotos.sortOrder) }).from(castPhotos).where(and(eq(castPhotos.castId, castId), eq(castPhotos.kind, kind)));
  let order = m ?? 0;
  try {
    for (const f of files) {
      const url = await saveImage(f, `shop${(await currentShopId())}/cast${castId}`);
      await db.insert(castPhotos).values({ shopId: (await currentShopId()), castId, kind, url, sortOrder: ++order });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "保存できませんでした", photos: await list(castId) }, { status: 400 });
  }
  return NextResponse.json({ photos: await list(castId) });
}

/** 並び替え：{ kind, ids: [並び順の写真id] } */
export async function PATCH(req: Request, ctx: Ctx) {
  const castId = await castOf(ctx);
  if (!castId) return NextResponse.json({ error: "女性が見つかりません" }, { status: 404 });
  const body = (await req.json()) as { ids?: number[] };
  const ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
  for (let i = 0; i < ids.length; i++) {
    await db.update(castPhotos).set({ sortOrder: i + 1 }).where(and(eq(castPhotos.id, ids[i]), eq(castPhotos.castId, castId)));
  }
  return NextResponse.json({ photos: await list(castId) });
}

/** 削除：?photoId= */
export async function DELETE(req: Request, ctx: Ctx) {
  const castId = await castOf(ctx);
  if (!castId) return NextResponse.json({ error: "女性が見つかりません" }, { status: 404 });
  const pid = Number(new URL(req.url).searchParams.get("photoId"));
  const [p] = await db.select().from(castPhotos).where(and(eq(castPhotos.id, pid), eq(castPhotos.castId, castId)));
  if (p) {
    await db.delete(castPhotos).where(eq(castPhotos.id, p.id));
    await removeImage(p.url);
  }
  return NextResponse.json({ photos: await list(castId) });
}
