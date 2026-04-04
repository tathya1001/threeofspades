import type { Metadata } from "next";
import { Akaya_Kanadaka } from "next/font/google";
import "./globals.css";

const akayaKanadaka = Akaya_Kanadaka({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-akaya",
});

export const metadata: Metadata = {
  title: "Three of Spades",
  description: "Three of Spades card game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${akayaKanadaka.variable} antialiased`}
        style={{ fontFamily: "var(--font-akaya), sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}

