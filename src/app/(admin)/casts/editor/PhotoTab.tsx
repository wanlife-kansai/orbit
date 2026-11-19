"use client";
import { useRef, useState } from "react";
import { PHOTO_MAX, THUMB_MAX } from "@/lib/castFields";
import { Card } from "./ui";

export type Photo = { id: number; kind: string; url: string; sortOrder: number };

function Section({
  kind,
  title,
  note,
  max,
  photos,
  castId,
  onPhotos,
}: {
  kind: "thumb" | "photo";
  title: string;
  note: string;
  max: number;
  photos: Photo[];
  castId: number;
  onPhotos: (p: Photo[]) => void;
}) {
  const list = photos.filter((p) => p.kind === kind);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const base = `/api/casts/${castId}/photos`;

  const send = async (init: RequestInit, url = base) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, init);
      const data = (await res.json()) as { photos?: Photo[]; error?: string };
      if (data.photos) onPhotos(data.photos);
      if (!res.ok) setError(data.error ?? "うまくいきませんでした");
    } catch {
      setError("通信できませんでした");
    } finally {
      setBusy(false);
    }
  };

  const upload = (files: FileList | File[] | null) => {
    const arr = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) return;
    const fd = new FormData();
    fd.set("kind", kind);
    arr.slice(0, Math.max(0, max - list.length)).forEach((f) => fd.append("files", f));
    if (arr.length > max - list.length) setError(`残り${max - list.length}枚のため、多い分は追加しませんでした`);
    void send({ method: "POST", body: fd });
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const ids = list.map((p) => p.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    void send({ method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
  };
  const remove = (p: Photo) => {
    if (confirm("この画像を削除しますか？")) void send({ method: "DELETE" }, `${base}?photoId=${p.id}`);
  };

  return (
    <Card
      title={title}
      right={
        <span className="text-xs text-zinc-400">
          登録枚数 {list.length} / {max}
        </span>
      }
    >
      <p className="mb-3 text-xs text-zinc-500">{note}</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          upload(e.dataTransfer.files);
        }}
        className={`grid grid-cols-2 gap-3 rounded-lg p-2 sm:grid-cols-3 lg:grid-cols-5 ${over ? "bg-violet-950/40 ring-2 ring-violet-500" : ""}`}
      >
        {list.map((p, i) => (
          <figure key={p.id} className="group relative overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-zinc-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" className="aspect-[3/4] w-full object-cover" />
            <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 text-[11px]">No.{i + 1}</span>
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/70 p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              <span className="flex gap-1">
                <button type="button" disabled={busy || i === 0} onClick={() => move(i, -1)} className="rounded bg-zinc-700 px-2 text-xs disabled:opacity-30" aria-label="前へ">←</button>
                <button type="button" disabled={busy || i === list.length - 1} onClick={() => move(i, 1)} className="rounded bg-zinc-700 px-2 text-xs disabled:opacity-30" aria-label="後ろへ">→</button>
              </span>
              <button type="button" disabled={busy} onClick={() => remove(p)} className="rounded bg-rose-700 px-2 text-xs">削除</button>
            </div>
          </figure>
        ))}
        {list.length < max && (
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-zinc-700 text-xs text-zinc-400 hover:border-violet-500 hover:text-violet-300"
          >
            {busy ? (
              "処理中…"
            ) : (
              <>
                <span className="text-2xl leading-none">＋</span>
                画像をドロップ
                <br />
                または選択
                <span className="text-[11px] text-zinc-500">残{max - list.length}枚</span>
              </>
            )}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => {
        upload(e.target.files);
        e.target.value = "";
      }} />
      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
    </Card>
  );
}

export function PhotoTab({ castId, photos, onPhotos }: { castId: number | null; photos: Photo[]; onPhotos: (p: Photo[]) => void }) {
  if (!castId) {
    return <div className="card p-6 text-sm text-zinc-400">画像は、女性を一度「保存」してから登録できます。</div>;
  }
  return (
    <div className="space-y-4">
      <Section kind="thumb" title="サムネイル画像" note="サムネイルを指定したい場合はこちらにアップロードしてください。未登録なら「画像」の1枚目を使います。" max={THUMB_MAX} photos={photos} castId={castId} onPhotos={onPhotos} />
      <Section kind="photo" title="画像" note="プロフィールの写真。1枚目がメインになります。画像はドロップでも追加できます（JPEG・PNG・WebP・GIF、1枚10MBまで）。" max={PHOTO_MAX} photos={photos} castId={castId} onPhotos={onPhotos} />
    </div>
  );
}
