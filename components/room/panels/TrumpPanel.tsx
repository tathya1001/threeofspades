"use client"

import { useState } from "react"
import { RANKS } from "@/shared/game"
import { rankLabel, SUIT_INFO, TRUMP_OPTIONS } from "@/lib/cards"
import { playerName, type RoomActions } from "@/lib/room"
import type { RoomView, TrumpSuit } from "@/lib/types"

interface Slot {
    suit: string
    rank: string
    priority: string
}

const EMPTY_SLOT: Slot = { suit: "", rank: "", priority: "" }
const SUIT_CHOICES = ["S", "D", "C", "H"]

export function TrumpPanel({ room, actions }: { room: RoomView; actions: RoomActions }) {
    const [trump, setTrump] = useState<TrumpSuit | null>(null)
    const [slots, setSlots] = useState<Slot[]>([])

    const isSelector = room.trumpSelectorId === room.selfId
    const needed = room.numPartners
    const usesPriority = room.numDecks > 1
    const filled = Array.from({ length: needed }, (_, i) => slots[i] ?? EMPTY_SLOT)

    const cardOf = (slot: Slot) => (slot.rank && slot.suit ? slot.rank + slot.suit : "")
    const holds = (card: string) => card !== "" && room.hand.includes(card)

    const slotComplete = (slot: Slot) => {
        if (!cardOf(slot)) return false
        if (!usesPriority) return true
        // Priority 0 ("the copy I'm not holding") only makes sense for a card you hold.
        return slot.priority !== "" && (slot.priority !== "0" || holds(cardOf(slot)))
    }
    const identity = (slot: Slot) => (usesPriority ? `${cardOf(slot)}:${slot.priority}` : cardOf(slot))
    const allComplete = filled.every(slotComplete)
    const hasDuplicates = allComplete && new Set(filled.map(identity)).size !== filled.length
    const canConfirm = trump !== null && allComplete && !hasDuplicates

    const updateSlot = (index: number, field: keyof Slot, value: string) => {
        setSlots(previous => {
            const next = Array.from({ length: needed }, (_, i) => previous[i] ?? EMPTY_SLOT)
            const slot = { ...next[index], [field]: value }
            if (slot.priority === "0" && !holds(cardOf(slot))) slot.priority = ""
            next[index] = slot
            return next
        })
    }

    const confirm = () => {
        if (!canConfirm || !trump) return
        actions.confirmTrump(
            trump,
            filled.map(cardOf),
            usesPriority ? filled.map(slot => Number(slot.priority)) : undefined,
        )
    }

    const hint = !trump
        ? "pick a trump suit first"
        : !allComplete
            ? `fill all ${needed} turning card${needed > 1 ? "s" : ""}${usesPriority ? " (incl. priority)" : ""}`
            : hasDuplicates ? "each turning card must be different" : null

    return (
        <div className="flex flex-col gap-3">
            <div>
                <div className="text-[13px] text-[#8E8980]">bid won</div>
                <div className="text-3xl font-bold text-[#CE670E] leading-none">{room.highestBid}</div>
                <div className="text-sm text-[#8E8980] mt-0.5">
                    by {playerName(room, room.trumpSelectorId)} · {needed} partner{needed !== 1 ? "s" : ""}
                </div>
            </div>

            <div className="w-full h-px bg-[#E5E0D5]" />

            {!isSelector ? (
                <p className="text-[#8E8980] text-base italic leading-relaxed">
                    waiting for <span className="text-[#2D2A26] font-semibold">{playerName(room, room.trumpSelectorId)}</span> to set cards...
                </p>
            ) : (
                <div className="flex flex-col gap-3.5">
                    <div>
                        <div className="text-[13px] text-[#8E8980] mb-2">choose trump</div>
                        <div className="flex flex-col gap-1.5">
                            {TRUMP_OPTIONS.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setTrump(option.value)}
                                    aria-pressed={trump === option.value}
                                    className={`flex items-center gap-3 p-2 rounded-lg border text-lg font-semibold transition-all cursor-pointer ${option.color} ${trump === option.value
                                        ? `bg-[#FAF7F2]/60 ${option.border} shadow-[0_2px_8px_rgba(20,58,108,0.1)]`
                                        : "border-[#D8D3C5]"
                                        }`}
                                >
                                    <span className="text-2xl">{option.symbol}</span>
                                    <span>{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="w-full h-px bg-[#E5E0D5]" />

                    <div>
                        <div className="text-[13px] text-[#8E8980] mb-2">
                            turning cards
                            <span className="ml-1.5 text-[#CE670E]/70 font-semibold">×{needed}</span>
                        </div>

                        {needed === 0 ? (
                            <p className="text-[13px] text-[#5C5751] leading-relaxed">
                                This bid doesn&rsquo;t earn a partner, so you&rsquo;re playing solo.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-2.5">
                                {filled.map((slot, index) => {
                                    const card = cardOf(slot)
                                    return (
                                        <div key={index} className="flex flex-col gap-1">
                                            <div className="flex gap-1.5 items-center">
                                                <span className="text-[12px] text-[#8E8980]/50 w-4 shrink-0">{index + 1}</span>
                                                <select
                                                    aria-label={`Turning card ${index + 1} suit`}
                                                    value={slot.suit}
                                                    onChange={e => updateSlot(index, "suit", e.target.value)}
                                                    className="card-select"
                                                >
                                                    <option value="">suit</option>
                                                    {SUIT_CHOICES.map(s => (
                                                        <option key={s} value={s}>{SUIT_INFO[s].symbol} {SUIT_INFO[s].name}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    aria-label={`Turning card ${index + 1} rank`}
                                                    value={slot.rank}
                                                    onChange={e => updateSlot(index, "rank", e.target.value)}
                                                    className="card-select"
                                                >
                                                    <option value="">rank</option>
                                                    {RANKS.map(r => (
                                                        <option key={r} value={r}>{rankLabel(r)}</option>
                                                    ))}
                                                </select>
                                                {usesPriority && (
                                                    <select
                                                        aria-label={`Turning card ${index + 1} priority`}
                                                        value={slot.priority}
                                                        onChange={e => updateSlot(index, "priority", e.target.value)}
                                                        className="card-select"
                                                        style={{ maxWidth: "64px" }}
                                                    >
                                                        <option value="">#</option>
                                                        {holds(card) && <option value="0">0</option>}
                                                        {Array.from({ length: room.numDecks }, (_, i) => (
                                                            <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                            {!usesPriority && holds(card) && (
                                                <span className="text-[11px] text-amber-700 pl-5">
                                                    you hold this card, so it won&rsquo;t bring a partner
                                                </span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={confirm}
                        disabled={!canConfirm}
                        className="w-full py-2.5 border border-[#CE670E]/40 rounded-lg text-[#CE670E] bg-[#CE670E]/5 text-xl font-bold hover:bg-[#CE670E]/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                        Set Cards
                    </button>

                    {hint && <p className="text-[12px] text-red-500/80 -mt-1 text-center">{hint}</p>}
                </div>
            )}
        </div>
    )
}
