import "./globals.css";
import type { Metadata } from "next";
import { CMS_NAME, CMS_TAGLINE } from "@/lib/brand";

export const metadata: Metadata = { title: `${CMS_NAME} | ${CMS_TAGLINE}`, robots: { index: false, follow: false } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* 画面が出る前に、保存した明るさを当てる（ちらつき防止）。初期は明るい画面 */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem("orbit-theme")!=="dark")document.documentElement.classList.add("light")}catch(e){document.documentElement.classList.add("light")}` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
