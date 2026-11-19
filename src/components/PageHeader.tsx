export function PageHeader({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {desc && <p className="mt-1 text-sm text-zinc-400">{desc}</p>}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}
