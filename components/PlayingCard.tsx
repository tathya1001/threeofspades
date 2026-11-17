"use client"

import { useState, type CSSProperties } from "react"
import { cardName, rankLabel, SUIT_INFO } from "@/lib/cards"
import { rankOf, suitOf } from "@/shared/game"

interface PlayingCardProps {
    card: string
    width: number
    height: number
    className?: string
    style?: CSSProperties
}

export function PlayingCard({ card, width, height, className = "", style }: PlayingCardProps) {
    const [failed, setFailed] = useState(false)

    // If a face fails to load, a plain text card keeps the game playable.
    if (failed) {
        const suit = SUIT_INFO[suitOf(card)]
        return (
            <div
                role="img"
                aria-label={cardName(card)}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-md border-[1.5px] border-[#D8D3C5] bg-[#FDFCFB] ${className}`}
                style={{ width, height, ...style }}
            >
                <span style={{ color: suit?.color, fontSize: width * 0.3, lineHeight: 1 }}>{suit?.symbol}</span>
                <span className="font-semibold text-black/60" style={{ fontSize: width * 0.2 }}>{rankLabel(rankOf(card))}</span>
            </div>
        )
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element -- static SVG faces, which the image optimiser passes through untouched anyway
        <img
            src={`/cards/${card}.svg`}
            alt={cardName(card)}
            width={width}
            height={height}
            draggable={false}
            decoding="async"
            onError={() => setFailed(true)}
            className={`block select-none rounded-md ${className}`}
            style={style}
        />
    )
}
