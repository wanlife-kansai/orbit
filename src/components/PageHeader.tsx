export function PageHeader({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-zinc-700/70 pb-5">
      <div className="max-w-3xl">
        <h1 className="text-[26px] font-bold leading-tight text-zinc-100">{title}</h1>
        {desc && <p className="mt-2 text-sm leading-relaxed text-zinc-400">{desc}</p>}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}
