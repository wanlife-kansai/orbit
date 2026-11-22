import { CMS_NAME } from "@/lib/brand";

/**
 * ORBIT のマーク：自店（中心の点）と、そのまわりを回る1本の軌道。
 * 軌道の上の金色の点は「いま動いている配信」。
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="14" fill="none" stroke="var(--color-violet-600)" strokeWidth="3" />
      <circle cx="20" cy="20" r="5" fill="var(--color-zinc-100)" />
      <circle cx="30" cy="10" r="4.2" fill="var(--orbit-gold)" stroke="var(--color-zinc-950)" strokeWidth="2" />
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span className="font-bold" style={{ fontSize: size * 0.68, letterSpacing: "0.06em" }}>
        {CMS_NAME}
      </span>
    </span>
  );
}
