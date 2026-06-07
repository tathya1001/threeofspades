import type { Metadata, Viewport } from "next";
import { Akaya_Kanadaka, Yatra_One } from "next/font/google";
import "./globals.css";

const yatraOne = Yatra_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-yatraOne",
});

const akayaKanadaka = Akaya_Kanadaka({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-akaya",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Kings and Rebels",
  description: "Kings and Rebels card game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${yatraOne.variable} antialiased`}
        style={{ fontFamily: "var(--font-yatraOne), sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}

