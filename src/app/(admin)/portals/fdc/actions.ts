"use server";
import { fdcCompare, fdcRestoreDay, fdcSendDay, fdcTest } from "@/lib/portals/fdc";

export async function testAction() {
  return fdcTest();
}
export async function compareAction(castId: number, date: string) {
  return fdcCompare(castId, date);
}
export async function sendAction(castId: number, date: string) {
  return fdcSendDay(castId, date);
}
export async function restoreAction(castId: number, date: string, before: { from: string; to: string; freeText: string }) {
  return fdcRestoreDay(castId, date, before);
}

import { fdcBatches, fdcPlan, fdcRestoreMany, fdcSendMany } from "@/lib/portals/fdc";
export async function planAction(from: string, to: string) {
  return fdcPlan(from, to);
}
export async function sendManyAction(batch: string, items: Parameters<typeof fdcSendMany>[1]) {
  return fdcSendMany(batch, items);
}
export async function restoreManyAction(batch: string) {
  return fdcRestoreMany(batch);
}
export async function batchesAction() {
  return fdcBatches();
}
