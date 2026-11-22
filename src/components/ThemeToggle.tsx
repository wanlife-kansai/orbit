"use client";
import { useEffect, useState } from "react";

/** 明るさ（ライト／ダーク）の切り替え。選んだ明るさはこのブラウザに保存します */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [light, setLight] = useState(false);
  useEffect(() => setLight(document.documentElement.classList.contains("light")), []);
  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("orbit-theme", next ? "light" : "dark");
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={toggle}
      title={light ? "ダークモードにする" : "ライトモードにする"}
      aria-label={light ? "ダークモードにする" : "ライトモードにする"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 hover:border-violet-400 hover:text-violet-200 ${className}`}
    >
      {light ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4" fill="currentColor" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}
