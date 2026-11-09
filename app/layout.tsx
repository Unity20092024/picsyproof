import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PicsyProof | Turnover proof made simple",
  description: "Simple cleaning checklists and photo evidence for short-term rental hosts.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
