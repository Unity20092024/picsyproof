import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "PicsyProof | Beautifully Proven",
  description:
    "Thoughtful turnover checklists and local photo previews for rental properties.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#583271" },
    { media: "(prefers-color-scheme: dark)", color: "#25132f" },
  ],
};
const themeScript = `try{var t=localStorage.getItem('picsyproof-theme');document.documentElement.dataset.theme=(t==='light'||t==='dark')?t:'system'}catch(e){}`;
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
