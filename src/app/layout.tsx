import "./globals.css";
import type { Metadata } from "next";
import { CMS_NAME, CMS_TAGLINE } from "@/lib/brand";

export const metadata: Metadata = { title: `${CMS_NAME} | ${CMS_TAGLINE}`, robots: { index: false, follow: false } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
