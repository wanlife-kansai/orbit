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
