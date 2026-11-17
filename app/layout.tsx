import type { Metadata, Viewport } from "next"
import { Yatra_One } from "next/font/google"
import "./globals.css"

const displayFont = Yatra_One({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-display",
})

const description = "A real-time multiplayer trick-taking card game of bold bids and secret partners."

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    // Keeps double-tap and pinch zoom from shifting the table mid-game on phones.
    maximumScale: 1,
    userScalable: false,
    themeColor: "#F3EFE6",
}

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://3ofspades.vercel.app"),
    title: {
        default: "Kings and Rebels",
        template: "%s · Kings and Rebels",
    },
    description,
    openGraph: {
        title: "Kings and Rebels",
        description,
        type: "website",
        images: [{ url: "/screenshots/ss1.png", alt: "Kings and Rebels home screen" }],
    },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <body className={`${displayFont.variable} antialiased`}>{children}</body>
        </html>
    )
}
