import "./globals.css";
import type { Metadata } from "next";
import { CMS_NAME, CMS_TAGLINE } from "@/lib/brand";

export const metadata: Metadata = { title: `${CMS_NAME} | ${CMS_TAGLINE}`, robots: { index: false, follow: false } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* 画面が出る前に、保存した明るさを当てる（ちらつき防止） */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem("orbit-theme")==="light")document.documentElement.classList.add("light")}catch(e){}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
