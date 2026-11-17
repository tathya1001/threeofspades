"use client"

import { useState } from "react"
import { playerName, type RoomActions } from "@/lib/room"
import type { RoomView } from "@/lib/types"

const OPENING_EXTRAS = [0, 5, 10, 15, 20, 25, 30, 50]

/** Opening round: in turn, each player either starts the bidding or passes. */
export function OpeningPanel({ room, isMyTurn, actions }: { room: RoomView; isMyTurn: boolean; actions: RoomActions }) {
    const [extra, setExtra] = useState(0)
    const openingBid = room.minBid + extra
    const currentBidder = room.players[room.currentBidderIndex]

    const open = () => {
        actions.openBid(extra)
        setExtra(0)
    }

    return (
        <div className="flex flex-col gap-3">
            <div>
                <div className="text-[13px] text-[#8E8980]">opening bid</div>
                <div className="text-3xl font-bold text-[#2D2A26]/40 leading-none">{openingBid}</div>
                <div className="text-[11px] text-[#8E8980]/70 mt-0.5">
                    base {room.minBid}{extra > 0 ? ` + ${extra}` : ""}
                </div>
            </div>

            {isMyTurn ? (
                <div className="flex flex-col gap-2.5">
                    <div>
                        <div className="text-[12px] text-[#8E8980] mb-1.5">add to opening bid</div>
                        <div className="grid grid-cols-4 gap-1.5">
                            {OPENING_EXTRAS.map(n => (
                                <button
                                    key={n}
                                    onClick={() => setExtra(n)}
                                    disabled={room.minBid + n > room.maxPoints}
                                    aria-pressed={extra === n}
                                    className={`py-1.5 rounded-lg border text-[13px] font-semibold transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed ${extra === n
                                        ? "border-[#CE670E] text-[#CE670E] bg-[#CE670E]/10"
                                        : "border-[#D8D3C5] text-[#2D2A26] bg-[#FDFCFB] hover:bg-[#EBE7DC]"
                                        }`}
                                >
                                    {n === 0 ? "—" : `+${n}`}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={open}
                        className="w-full py-3 border border-[#CE670E] rounded-lg text-white bg-[#CE670E] font-bold text-[1.1rem] hover:bg-[#0f2e57] hover:border-[#0f2e57] transition-all cursor-pointer shadow-sm"
                    >
                        Start Bid · {openingBid}
                    </button>

                    <button
                        onClick={actions.passOpening}
                        className="w-full py-2.5 border border-[#D8D3C5] rounded-lg text-[#8E8980] font-bold text-[1rem] hover:bg-[#EBE7DC] hover:text-[#2D2A26] transition-all cursor-pointer"
                    >
                        Pass
                    </button>
                </div>
            ) : (
                <p className="text-[#8E8980] text-base italic leading-relaxed">
                    waiting for <span className="text-[#2D2A26] font-semibold">{playerName(room, currentBidder?.id)}</span> to open...
                </p>
            )}
        </div>
    )
}
