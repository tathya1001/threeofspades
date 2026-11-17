import type { ReactNode } from "react"
import type { AvatarStyle } from "@/lib/types"

const BODY = "M9 60v-2c0-12.2 9.8-22 22-22h2c12.2 0 22 9.8 22 22v2z"

// Drawn on a 64x64 grid. Details are cut out with evenodd fills rather than
// painted, so each avatar stays a single colour on any background.
const SHAPES: Record<AvatarStyle, ReactNode> = {
    default: (
        <>
            <circle cx="32" cy="19" r="12" />
            <path d={BODY} />
        </>
    ),
    ninja: (
        <>
            <path fillRule="evenodd" d="M32 7a12 12 0 1 1 0 24a12 12 0 1 1 0-24zM25.5 15.5h13a3 3 0 0 1 0 6h-13a3 3 0 0 1 0-6z" />
            <path d="M42.5 14.5l11-5.5-2.5 6.5 5 3.5-13 .5z" />
            <path d={BODY} />
        </>
    ),
    tie: (
        <>
            <circle cx="32" cy="19" r="12" />
            <path fillRule="evenodd" d={`${BODY}M29 37.5h6l-1 4h-4zM30 42.5h4l2.5 11.5-4.5 4.5-4.5-4.5z`} />
        </>
    ),
}

export function AvatarIcon({ dress, color, size = 54 }: { dress?: AvatarStyle; color?: string; size?: number }) {
    return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
            <g fill={color || "#2D2A26"}>{SHAPES[dress ?? "default"] ?? SHAPES.default}</g>
        </svg>
    )
}
