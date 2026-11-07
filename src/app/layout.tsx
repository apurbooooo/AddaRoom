import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AddaRoom — Your Circle. Your Room. Your Adda.",
  description: "A private place to watch, talk, share and hang out with your favorite people. Free, open-source, and registration-free.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AddaRoom",
  },
  icons: {
    icon: [
      { url: "/brand/addaroom-favicon.svg", type: "image/svg+xml" },
      { url: "/brand/addaroom-symbol.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-black text-white flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
