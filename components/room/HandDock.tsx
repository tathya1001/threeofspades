"use client"

import { useMemo, useState } from "react"
import { isLegalPlay, suitOf } from "@/shared/game"
import { cardName, sortHand, SUIT_INFO, withCopyKeys, type SortMode } from "@/lib/cards"
import { useElementWidth } from "@/lib/hooks"
import type { RoomActions } from "@/lib/room"
import type { RoomView } from "@/lib/types"
import { PlayingCard } from "../PlayingCard"

const CARD_GAP = 4
// The rank and suit sit in the card's top-left corner; this much must stay
// visible when cards overlap.
const MIN_VISIBLE_FRACTION = 0.3
const HAND_SIDE_PADDING = 48

interface CardHandProps {
    cards: { card: string; key: string }[]
    selectedKey: string | null
    onSelect: (key: string) => void
    canSelect: (card: string) => boolean
    opacity: number
    cardW: number
    cardH: number
    availableWidth: number
}

/**
 * Fans the hand out to fill the space available, overlapping only as much as
 * needed. If even the tightest overlap doesn't fit, the strip scrolls.
 */
function CardHand({ cards, selectedKey, onSelect, canSelect, opacity, cardW, cardH, availableWidth }: CardHandProps) {
    const n = cards.length
    const naturalWidth = n * cardW + (n - 1) * CARD_GAP
    const tightestWidth = cardW + (n - 1) * Math.round(cardW * MIN_VISIBLE_FRACTION)
    const width = Math.max(Math.min(naturalWidth, availableWidth || naturalWidth), tightestWidth)
    const step = n > 1 ? Math.min(cardW + CARD_GAP, (width - cardW) / (n - 1)) : 0

    return (
        <div className="relative mx-auto" style={{ width, height: cardH, opacity }}>
            {cards.map(({ card, key }, i) => {
                const isSelected = selectedKey === key
                const selectable = canSelect(card)
                return (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onSelect(key)}
                        disabled={!selectable}
                        aria-pressed={isSelected}
                        aria-label={cardName(card)}
                        className={`absolute top-0 p-0 rounded-md transition-[left,transform,filter,opacity] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CE670E] ${isSelected
                            ? "-translate-y-4"
                            : selectable ? "hover:-translate-y-3 cursor-pointer" : "opacity-45 saturate-50 cursor-not-allowed"
                            }`}
                        style={{ left: i * step, zIndex: isSelected ? n + 1 : i, width: cardW, height: cardH }}
                    >
                        <PlayingCard
                            card={card}
                            width={cardW}
                            height={cardH}
                            style={{
                                boxShadow: isSelected
                                    ? "0 0 20px rgba(20,58,108,0.3), 0 4px 16px rgba(0,0,0,0.15)"
                                    : "0 4px 16px rgba(0,0,0,0.15)",
                                outline: isSelected ? "2px solid rgba(20,58,108,0.8)" : "none",
                            }}
                        />
                    </button>
                )
            })}
        </div>
    )
}

const sortButton = (active: boolean, isMobile: boolean) =>
    `${isMobile ? "flex-1 py-1 text-[11px]" : "w-full py-1.5 text-[14px]"} rounded-lg border font-semibold transition-all cursor-pointer ${active
        ? "border-[#CE670E]/50 text-[#CE670E] bg-[#CE670E]/8"
        : `border-[#D8D3C5] text-[#8E8980] ${isMobile ? "" : "hover:border-[#CE670E]/40 hover:text-[#CE670E]"}`
    }`

interface HandDockProps {
    room: RoomView
    actions: RoomActions
    isMobile: boolean
    isMyPlayTurn: boolean
}

export function HandDock({ room, actions, isMobile, isMyPlayTurn }: HandDockProps) {
    const [sortMode, setSortMode] = useState<SortMode>("suit")
    const [selectedKey, setSelectedKey] = useState<string | null>(null)
    const [opacity, setOpacity] = useState(1)
    const [handAreaRef, handAreaWidth] = useElementWidth<HTMLDivElement>()

    const cards = useMemo(() => withCopyKeys(sortHand(room.hand, sortMode)), [room.hand, sortMode])
    const selectedCard = cards.find(c => c.key === selectedKey)?.card ?? null

    const leadSuit = room.currentTrick.length && !room.trickPending ? suitOf(room.currentTrick[0].card) : null
    const isPlayable = (card: string) => isLegalPlay(room.hand, card, leadSuit)
    // Only grey out cards while it's actually your turn; between turns you can pre-select freely.
    const canSelect = (card: string) => !isMyPlayTurn || isPlayable(card)
    const canPlay = isMyPlayTurn && selectedCard !== null && isPlayable(selectedCard)
    const mustFollow = isMyPlayTurn && leadSuit !== null && room.hand.some(c => suitOf(c) === leadSuit)

    const cardW = isMobile ? 52 : 72
    const cardH = isMobile ? 73 : 101

    const play = () => {
        if (!canPlay || !selectedCard) return
        actions.playCard(selectedCard)
        setSelectedKey(null)
    }

    const playLabel = room.gameOver
        ? "Game Over"
        : !isMyPlayTurn
            ? "Waiting..."
            : !selectedCard
                ? "Select a Card"
                : canPlay ? "Play Card" : `Follow ${SUIT_INFO[leadSuit ?? ""]?.symbol ?? "suit"}`

    return (
        <div className="animate-deal-in flex flex-row border-t border-[#E5E0D5] shrink-0">
            <div ref={handAreaRef} className="relative flex-1 flex flex-col justify-center bg-[#F3EFE6] overflow-hidden">
                {isMyPlayTurn && (
                    <div className="absolute top-1.5 left-3 z-10 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] font-bold text-[#CE670E] pointer-events-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#CE670E] animate-pulse" />
                        your turn{mustFollow && leadSuit ? ` · follow ${SUIT_INFO[leadSuit].symbol}` : ""}
                    </div>
                )}
                <div className="w-full overflow-x-auto overflow-y-visible text-center pt-5 pb-2 cards-scrollbar">
                    <div className="inline-block text-left px-6 relative">
                        <CardHand
                            cards={cards}
                            selectedKey={selectedCard ? selectedKey : null}
                            onSelect={key => setSelectedKey(previous => (previous === key ? null : key))}
                            canSelect={canSelect}
                            opacity={opacity}
                            cardW={cardW}
                            cardH={cardH}
                            availableWidth={Math.max(handAreaWidth - HAND_SIDE_PADDING, 0)}
                        />
                    </div>
                </div>
            </div>

            <div
                className={`flex flex-row ${isMobile ? "gap-1.5 px-2 py-2" : "gap-3 px-3 py-3"} border-l border-[#E5E0D5] bg-[#EBE7DC] shrink-0`}
                style={{ width: isMobile ? 140 : 210 }}
            >
                {!isMobile && (
                    <div className="flex flex-col items-center justify-between w-8 select-none py-1 border-r border-[#D8D3C5] pr-2.5">
                        <div className="text-[#8E8980]" title="Card opacity: dim your hand if someone can see your screen">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                        </div>
                        <div className="h-[90px] w-6 flex items-center justify-center relative my-2">
                            <input
                                type="range"
                                min="0.05"
                                max="1"
                                step="0.05"
                                value={opacity}
                                onChange={e => setOpacity(parseFloat(e.target.value))}
                                aria-label="Card opacity"
                                className="absolute w-[90px] cursor-pointer vertical-slider"
                                style={{ transform: "rotate(-90deg)", height: "6px", margin: 0 }}
                            />
                        </div>
                        <span className="text-[10px] text-[#8E8980] font-mono tabular-nums leading-none">
                            {Math.round(opacity * 100)}%
                        </span>
                    </div>
                )}

                <div className="flex-1 flex flex-col justify-between gap-1">
                    <div className="flex flex-col gap-1.5">
                        {!isMobile && <div className="text-[11px] text-[#7A756E] tracking-wider uppercase mb-0.5">sort</div>}
                        <button onClick={() => setSortMode("suit")} aria-pressed={sortMode === "suit"} className={sortButton(sortMode === "suit", isMobile)}>
                            {isMobile ? "♠♦♣♥" : "♠♦♣♥ by suit"}
                        </button>
                        <button onClick={() => setSortMode("rank")} aria-pressed={sortMode === "rank"} className={sortButton(sortMode === "rank", isMobile)}>
                            {isMobile ? "2→A" : "2→A by rank"}
                        </button>
                    </div>

                    <button
                        onClick={play}
                        disabled={!canPlay}
                        className={`w-full ${isMobile ? "py-1.5 text-[13px]" : "py-2 text-[15px]"} rounded-lg border font-bold transition-all ${canPlay
                            ? "border-green-600/40 text-green-700 bg-green-50 hover:bg-green-100 active:scale-95 cursor-pointer"
                            : "border-[#D8D3C5] text-black/35 cursor-not-allowed"
                            }`}
                    >
                        {playLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
