"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { JoiningScreen, ReconnectingBanner } from "@/components/ConnectionStatus"
import { HandDock } from "@/components/room/HandDock"
import { Sidebar } from "@/components/room/Sidebar"
import { TableArea } from "@/components/room/TableArea"
import { useRoomConnection } from "@/components/room/useRoomConnection"
import { useMediaQuery } from "@/lib/hooks"
import { roomActions } from "@/lib/room"
import type { RoomView } from "@/lib/types"

export default function RoomPage() {
    const params = useParams<{ roomId: string }>()
    const search = useSearchParams()
    const roomId = (params.roomId ?? "").toUpperCase()
    const name = (search.get("name") ?? "").trim()
    const room = useRoomConnection(roomId, name)

    if (!room) return <JoiningScreen roomId={roomId} />
    return <GameRoom room={room} />
}

function GameRoom({ room }: { room: RoomView }) {
    const isMobile = useMediaQuery("(max-width: 768px)")
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const actions = useMemo(() => roomActions(room.id), [room.id])

    const isHost = room.hostId === room.selfId
    const isBidding = room.phase === "pre-bidding" || room.phase === "bidding"
    const isMyBidTurn = isBidding && room.players[room.currentBidderIndex]?.id === room.selfId
    const isMyPlayTurn = room.phase === "playing"
        && !room.gameOver
        && !room.trickPending
        && room.players[room.currentPlayerIndex]?.id === room.selfId
    const isMyTurn = isMyBidTurn || isMyPlayTurn || (room.phase === "trump-selection" && room.trumpSelectorId === room.selfId)

    // A nudge in the tab title for players who switched away while waiting.
    useEffect(() => {
        const previous = document.title
        document.title = isMyTurn ? "Your turn · Kings and Rebels" : `Room ${room.id} · Kings and Rebels`
        return () => {
            document.title = previous
        }
    }, [isMyTurn, room.id])

    return (
        <div className="flex w-screen h-screen bg-[#FAF7F2] text-[#2D2A26] overflow-hidden">
            <ReconnectingBanner />

            {isMobile && (
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="fixed top-3 left-3 z-30 w-10 h-10 flex items-center justify-center rounded-xl border border-[#D8D3C5] bg-[#F3EFE6]/90 backdrop-blur-sm shadow-md hover:bg-[#EBE7DC] transition-all cursor-pointer"
                    aria-label="Open menu"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#2D2A26" className="w-5 h-5" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                    {isMyTurn && !isMyPlayTurn && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#CE670E] animate-pulse" aria-label="Your move" />
                    )}
                </button>
            )}

            {isMobile && sidebarOpen && (
                <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={() => setSidebarOpen(false)} />
            )}

            <Sidebar
                room={room}
                actions={actions}
                isHost={isHost}
                isMyBidTurn={isMyBidTurn}
                isMobile={isMobile}
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <main className="flex-1 flex flex-col overflow-hidden">
                <TableArea room={room} actions={actions} isHost={isHost} isMobile={isMobile} />
                {room.hand.length > 0 && (
                    <HandDock room={room} actions={actions} isMobile={isMobile} isMyPlayTurn={isMyPlayTurn} />
                )}
            </main>
        </div>
    )
}
