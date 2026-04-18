import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Dashboard Oftalmos",
  description: "Gestão Clínica em Tempo Real",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" className={cn("min-h-screen bg-background font-sans antialiased", inter.variable)}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

