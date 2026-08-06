import "./globals.css";
import type { Metadata } from "next";
import React from "react";
import { Playfair_Display, Inter } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Meskel House - Digital Menu",
  description: "Fine dining & Ethiopian soul at Meskel House, Addis Ababa.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="font-sans antialiased bg-[#FAF7F2] text-[#1A1714]" style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  );
}

