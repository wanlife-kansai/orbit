import { useId } from "react";
import { CMS_NAME } from "@/lib/brand";

/** ORBIT のマーク：中心（自店のデータ）と、そのまわりを回る軌道と衛星（各サイト） */
export function LogoMark({ size = 32 }: { size?: number }) {
  const gid = `orbit-g-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="20" rx="17" ry="8" fill="none" stroke={`url(#${gid})`} strokeWidth="2.4" transform="rotate(-28 20 20)" />
      <circle cx="20" cy="20" r="6.5" fill={`url(#${gid})`} />
      <circle cx="34.2" cy="12.4" r="3" fill="#c4b5fd" />
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span className="font-semibold tracking-[0.18em]" style={{ fontSize: size * 0.72 }}>
        {CMS_NAME}
      </span>
    </span>
  );
}
