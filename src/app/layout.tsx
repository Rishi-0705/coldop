import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ColdOps — Cold Chain Energy Intelligence",
  description: "Detect ghost loads, optimize cold room utilization, and drive progressive setbacks for F&B manufacturing. Built for Marigold.",
  keywords: ["ColdOps", "cold chain", "energy", "ghost load", "F&B", "Marigold", "Malaysia", "SaaS"],
  authors: [{ name: "Double Dot Solutions Sdn Bhd" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "ColdOps — Cold Chain Energy Intelligence",
    description: "Detect ghost loads, optimize cold room utilization, and drive progressive setbacks for F&B manufacturing.",
    siteName: "ColdOps",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="light">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
