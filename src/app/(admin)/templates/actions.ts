"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { SHOP_ID } from "@/lib/shop";

const read = (fd: FormData) => ({
  title: String(fd.get("title") ?? "").trim(),
  body: String(fd.get("body") ?? "").trim(),
  label: String(fd.get("label") ?? "その他"),
  memo: String(fd.get("memo") ?? "").trim(),
});

export async function createTemplate(fd: FormData) {
  const v = read(fd);
  if (!v.title) return;
  await db.insert(schema.templates).values({ ...v, shopId: SHOP_ID });
  revalidatePath("/templates");
}

export async function updateTemplate(id: number, fd: FormData) {
  const v = read(fd);
  if (!v.title) return;
  await db.update(schema.templates).set(v).where(and(eq(schema.templates.id, id), eq(schema.templates.shopId, SHOP_ID)));
  revalidatePath("/templates");
  redirect("/templates");
}

export async function deleteTemplate(id: number) {
  await db.delete(schema.templates).where(and(eq(schema.templates.id, id), eq(schema.templates.shopId, SHOP_ID)));
  revalidatePath("/templates");
  redirect("/templates");
}
