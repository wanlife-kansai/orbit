"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentShopId } from "@/lib/shop";
import { TEMPLATE_MAX } from "./labels";

const read = (fd: FormData) => ({
  title: String(fd.get("title") ?? "").trim(),
  body: String(fd.get("body") ?? "").trim(),
  label: String(fd.get("label") ?? "その他"),
  memo: String(fd.get("memo") ?? "").trim(),
  groupName: String(fd.get("groupName") ?? "").trim().slice(0, 50),
});

export async function createTemplate(fd: FormData) {
  const v = read(fd);
  if (!v.title) return;
  const [{ n }] = await db.select({ n: count() }).from(schema.templates).where(eq(schema.templates.shopId, (await currentShopId())));
  if (n >= TEMPLATE_MAX) return;
  await db.insert(schema.templates).values({ ...v, shopId: (await currentShopId()), sortOrder: n + 1 });
  revalidatePath("/templates");
}

export async function updateTemplate(id: number, fd: FormData) {
  const v = read(fd);
  if (!v.title) return;
  await db.update(schema.templates).set(v).where(and(eq(schema.templates.id, id), eq(schema.templates.shopId, (await currentShopId()))));
  revalidatePath("/templates");
  redirect("/templates");
}

export async function deleteTemplate(id: number) {
  await db.delete(schema.templates).where(and(eq(schema.templates.id, id), eq(schema.templates.shopId, (await currentShopId()))));
  revalidatePath("/templates");
  redirect("/templates");
}

export async function deleteTemplates(ids: number[]) {
  if (ids.length) await db.delete(schema.templates).where(and(eq(schema.templates.shopId, (await currentShopId())), inArray(schema.templates.id, ids)));
  revalidatePath("/templates");
}

export async function reorderTemplates(ids: number[]) {
  for (let i = 0; i < ids.length; i++) await db.update(schema.templates).set({ sortOrder: i + 1 }).where(and(eq(schema.templates.id, ids[i]), eq(schema.templates.shopId, (await currentShopId()))));
  revalidatePath("/templates");
}
