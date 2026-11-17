"use client"

import { useState } from "react"
import { PHASE_LABELS, phaseKey, seatColor, type RoomActions } from "@/lib/room"
import type { RoomView } from "@/lib/types"
import { AvatarIcon } from "../AvatarIcon"
import { InviteButton } from "./InviteButton"
import { BiddingPanel } from "./panels/BiddingPanel"
import { CustomizePanel } from "./panels/CustomizePanel"
import { OpeningPanel } from "./panels/OpeningPanel"
import { PlayingPanel } from "./panels/PlayingPanel"
import { TrumpPanel } from "./panels/TrumpPanel"
import { WaitingPanel } from "./panels/WaitingPanel"

const PHASE_STYLES: Record<ReturnType<typeof phaseKey>, string> = {
    "waiting": "text-[#7A756E] border-[#D8D3C5] bg-[#FAF7F2]",
    "pre-bidding": "text-amber-700 border-amber-300/40 bg-amber-50",
    "bidding": "text-blue-700 border-blue-300/40 bg-blue-50",
    "trump-selection": "text-orange-700 border-orange-300/40 bg-orange-50",
    "playing": "text-green-700 border-green-300/40 bg-green-50",
    "game-over": "text-[#7A756E] border-[#D8D3C5] bg-[#FAF7F2]",
}

interface SidebarProps {
    room: RoomView
    actions: RoomActions
    isHost: boolean
    isMyBidTurn: boolean
    isMobile: boolean
    open: boolean
    onClose: () => void
}

export function Sidebar({ room, actions, isHost, isMyBidTurn, isMobile, open, onClose }: SidebarProps) {
    const [customizing, setCustomizing] = useState(false)
    const phase = phaseKey(room)
    const me = room.players.find(p => p.id === room.selfId)

    return (
        <aside
            className={`${isMobile
                ? `fixed inset-y-0 left-0 z-50 w-[280px] transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "-translate-x-full"} shadow-2xl`
                : "w-[252px] min-w-[252px]"
                } h-full flex flex-col p-5 border-r border-[#E5E0D5] bg-[#F3EFE6] overflow-y-auto`}
        >
            {isMobile && (
                <button
                    onClick={onClose}
                    className="self-end mb-1 w-8 h-8 flex items-center justify-center rounded-lg border border-[#D8D3C5] text-[#8E8980] hover:text-[#2D2A26] hover:bg-[#FAF7F2] transition-all cursor-pointer shrink-0"
                    aria-label="Close menu"
                >
                    ✕
                </button>
            )}

            <div className="mb-[18px]">
                <div className="text-[13px] text-[#8E8980] tracking-wider mb-0.5">room</div>
                <div className="flex items-center justify-between gap-2">
                    <div className="text-[22px] font-bold tracking-wide leading-tight">{room.id}</div>
                    <InviteButton roomId={room.id} />
                </div>
                <div className={`inline-block mt-1.5 text-[12px] tracking-[0.1em] uppercase rounded px-2 py-0.5 border ${PHASE_STYLES[phase]}`}>
                    {PHASE_LABELS[phase]}
                </div>
            </div>

            <div className="w-full h-px bg-[#E5E0D5] mb-3" />

            {customizing ? (
                <CustomizePanel room={room} actions={actions} onDone={() => setCustomizing(false)} />
            ) : (
                <>
                    {room.phase === "waiting" && <WaitingPanel room={room} isHost={isHost} actions={actions} />}
                    {room.phase === "pre-bidding" && <OpeningPanel room={room} isMyTurn={isMyBidTurn} actions={actions} />}
                    {room.phase === "bidding" && <BiddingPanel room={room} isMyTurn={isMyBidTurn} actions={actions} />}
                    {room.phase === "trump-selection" && <TrumpPanel room={room} actions={actions} />}
                    {room.phase === "playing" && <PlayingPanel room={room} />}

                    <div className="mt-auto pt-4 shrink-0">
                        <div className="w-full h-px bg-[#E5E0D5] mb-4" />
                        <div className="flex items-center justify-between bg-[#FAF7F2] border border-[#E5E0D5] rounded-xl p-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <AvatarIcon dress={room.playerDresses[room.selfId]} color={seatColor(room, room.selfId)} size={40} />
                                <div className="min-w-0">
                                    <div className="font-semibold text-[15px] truncate max-w-[100px]">{me?.name ?? "You"}</div>
                                    <div className="text-[11px] text-[#8E8980] leading-none">you</div>
                                </div>
                            </div>
                            <button
                                onClick={() => setCustomizing(true)}
                                className="px-3 py-1.5 rounded-lg border border-[#D8D3C5] text-[12px] font-bold text-[#2D2A26] hover:bg-[#F3EFE6] transition-all cursor-pointer"
                            >
                                Customize
                            </button>
                        </div>
                    </div>
                </>
            )}
        </aside>
    )
}
