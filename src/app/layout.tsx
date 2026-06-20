import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
