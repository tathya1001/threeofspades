import { RANKS, rankOf, suitOf } from "@/shared/game"
import type { TrumpSuit } from "./types"

export type SortMode = "suit" | "rank"

export const SUIT_INFO: Record<string, { symbol: string; name: string; color: string }> = {
    S: { symbol: "♠", name: "Spades", color: "#3E3A35" },
    D: { symbol: "♦", name: "Diamonds", color: "#e05555" },
    C: { symbol: "♣", name: "Clubs", color: "#3E3A35" },
    H: { symbol: "♥", name: "Hearts", color: "#e05555" },
}

export const TRUMP_OPTIONS: { value: TrumpSuit; letter: string; label: string; symbol: string; color: string; border: string }[] = [
    { value: "hearts", letter: "H", label: "Hearts", symbol: "♥", color: "text-[#e05555]", border: "border-[#e05555]" },
    { value: "diamonds", letter: "D", label: "Diamonds", symbol: "♦", color: "text-[#e05555]", border: "border-[#e05555]" },
    { value: "clubs", letter: "C", label: "Clubs", symbol: "♣", color: "text-[#3E3A35]", border: "border-[#3E3A35]" },
    { value: "spades", letter: "S", label: "Spades", symbol: "♠", color: "text-[#3E3A35]", border: "border-[#3E3A35]" },
]

// Alternating colours, so neighbouring suits are easy to tell apart in a fanned hand.
const SUIT_SORT_ORDER = ["S", "D", "C", "H"]

const RANK_NAMES: Record<string, string> = { A: "Ace", K: "King", Q: "Queen", J: "Jack", T: "10" }

export function rankLabel(rank: string) {
    return rank === "T" ? "10" : rank
}

/** "Queen of Hearts", for alt text and screen readers. */
export function cardName(card: string) {
    const rank = rankOf(card)
    return `${RANK_NAMES[rank] ?? rank} of ${SUIT_INFO[suitOf(card)]?.name ?? "?"}`
}

export function sortHand(cards: string[], mode: SortMode) {
    const suitIndex = (card: string) => SUIT_SORT_ORDER.indexOf(suitOf(card))
    const rankIndex = (card: string) => RANKS.indexOf(rankOf(card))
    return [...cards].sort((a, b) => mode === "suit"
        ? suitIndex(a) - suitIndex(b) || rankIndex(a) - rankIndex(b)
        : rankIndex(a) - rankIndex(b) || suitIndex(a) - suitIndex(b))
}

/**
 * Two decks means duplicate cards in one hand. Numbering each copy gives every
 * card a stable identity for React keys and selection that survives re-sorting.
 */
export function withCopyKeys(cards: string[]) {
    const seen: Record<string, number> = {}
    return cards.map(card => {
        seen[card] = (seen[card] ?? 0) + 1
        return { card, key: `${card}#${seen[card]}` }
    })
}
