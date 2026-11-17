"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { kingsTarget, playerName, seatColor, teamSummary, type RoomActions } from "@/lib/room"
import type { RoomView } from "@/lib/types"
import { AvatarIcon } from "../AvatarIcon"
import { PlayingCard } from "../PlayingCard"

// Long enough for everyone to see the last card land before the summary covers the table.
const TRICK_POPUP_DELAY_MS = 3500

/** Evenly spaced seats around an oval, starting at the bottom (where "you" sit). */
function seatPosition(index: number, count: number, radiusX: number, radiusY: number) {
    const angle = Math.PI / 2 + (2 * Math.PI * index) / count
    return { x: 50 + radiusX * Math.cos(angle), y: 50 + radiusY * Math.sin(angle) }
}

const chip = (isMobile: boolean) => `${isMobile ? "text-[11px]" : "text-[13px]"} rounded px-2 py-px`

interface TableAreaProps {
    room: RoomView
    actions: RoomActions
    isHost: boolean
    isMobile: boolean
}

export function TableArea({ room, actions, isHost, isMobile }: TableAreaProps) {
    const router = useRouter()
    const [popupForHand, setPopupForHand] = useState<number | null>(null)
    const [dismissedHand, setDismissedHand] = useState<number | null>(null)

    useEffect(() => {
        if (!room.trickPending) return
        const hand = room.handNumber
        const timer = setTimeout(() => setPopupForHand(hand), TRICK_POPUP_DELAY_MS)
        return () => clearTimeout(timer)
    }, [room.trickPending, room.handNumber])

    const showTrickPopup = room.phase === "playing"
        && room.trickPending
        && popupForHand === room.handNumber
        && dismissedHand !== room.handNumber

    // Rotate the seating so this player is always at the bottom of the table.
    const selfIndex = room.players.findIndex(p => p.id === room.selfId)
    const seated = selfIndex >= 0 ? [...room.players.slice(selfIndex), ...room.players.slice(0, selfIndex)] : room.players

    const trickCardW = isMobile ? 40 : 52
    const trickCardH = isMobile ? 56 : 73
    const avatarSize = isMobile ? 38 : 54
    const isBidding = room.phase === "bidding" || room.phase === "pre-bidding"
    const currentBidderId = isBidding ? room.players[room.currentBidderIndex]?.id : null
    const currentPlayerId = room.phase === "playing" && !room.gameOver ? room.players[room.currentPlayerIndex]?.id : null

    return (
        <div className="relative flex-1 overflow-hidden">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[74%] h-[70%] border border-[#E5E0D5]/70 rounded-[50%] pointer-events-none" />
            {room.phase === "playing" && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[36%] h-[34%] border border-dashed border-[#E5E0D5]/90 rounded-[50%] pointer-events-none" />
            )}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-black/[0.03] text-sm tracking-[0.3em] uppercase pointer-events-none select-none">
                {room.id}
            </div>

            {room.phase === "playing" && seated.map((player, i) => {
                const entry = room.currentTrick.find(e => e.playerId === player.id)
                if (!entry) return null
                const pos = seatPosition(i, seated.length, 16, 16)
                const isWinningCard = room.trickPending && room.lastTrickWinner === player.id
                return (
                    <div
                        key={`trick-${player.id}`}
                        className="absolute transition-all duration-300"
                        style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)", zIndex: isWinningCard ? 2 : 1 }}
                    >
                        <PlayingCard
                            card={entry.card}
                            width={trickCardW}
                            height={trickCardH}
                            className={`rounded transition-transform duration-300 ${isWinningCard ? "scale-110" : ""}`}
                            style={{
                                boxShadow: isWinningCard
                                    ? "0 0 0 2px #CE670E, 0 4px 16px rgba(206,103,14,0.35)"
                                    : "0 2px 12px rgba(0,0,0,0.15)",
                            }}
                        />
                    </div>
                )
            })}

            {seated.map((player, i) => {
                const pos = seatPosition(i, seated.length, 38, 35)
                const isMe = player.id === room.selfId
                const isTheirTurn = player.id === currentBidderId || player.id === currentPlayerId
                const hasForfeited = room.forfeited.includes(player.id)
                const isHighestBidder = player.id === room.highestBidderId
                const cardCount = room.cardCounts[player.id] ?? 0

                return (
                    <div
                        key={player.id}
                        className={`absolute flex flex-col items-center gap-0.5 ${isMobile ? "min-w-[60px]" : "min-w-[88px]"} transition-opacity duration-300 ${player.offline ? "opacity-40 grayscale" : ""}`}
                        style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}
                    >
                        <div
                            className={`shrink-0 rounded-full transition-all ${isTheirTurn
                                ? "drop-shadow-[0_0_12px_rgba(20,58,108,0.4)] animate-pulse-glow"
                                : "drop-shadow-[0_2px_6px_rgba(0,0,0,0.15)]"
                                }`}
                        >
                            <AvatarIcon dress={room.playerDresses[player.id]} color={seatColor(room, player.id)} size={avatarSize} />
                        </div>

                        <div
                            className={`${isMobile ? "text-[12px]" : "text-[16px]"} text-center whitespace-nowrap tracking-wide drop-shadow-sm transition-all ${isMe ? "scale-105" : ""}`}
                            style={{ color: seatColor(room, player.id) }}
                        >
                            {player.name}
                            {player.id === room.hostId && <span className="text-xs ml-1 opacity-50">(host)</span>}
                        </div>

                        {player.offline && (
                            <span className={`${isMobile ? "text-[10px]" : "text-[11px]"} text-orange-600 border border-orange-400/40 bg-orange-50 rounded px-1.5 py-px font-semibold animate-pulse`}>
                                offline
                            </span>
                        )}

                        {room.phase === "playing" ? (
                            <div
                                className={`${isMobile ? "text-[11px]" : "text-[14px]"} text-[#8E8980] font-semibold tracking-wide mt-0.5`}
                                title="points / hands won"
                            >
                                ({room.playerPoints[player.id] ?? 0}/{room.playerTricks[player.id] ?? 0})
                            </div>
                        ) : (
                            <>
                                {room.cardsDealt && !isMe && cardCount > 0 && (
                                    <div className="text-[11px] text-[#8E8980]">{cardCount} cards</div>
                                )}
                                <div className="min-h-[24px] flex items-center justify-center">
                                    {player.id === currentBidderId && !hasForfeited ? (
                                        <span className={`${chip(isMobile)} text-blue-700 border border-blue-400/40 bg-blue-50 font-semibold animate-pulse`}>bidding...</span>
                                    ) : hasForfeited ? (
                                        <span className={`${chip(isMobile)} text-[#8E8980] border border-[#D8D3C5] bg-[#FAF7F2]`}>forfeit</span>
                                    ) : isHighestBidder && room.phase !== "waiting" ? (
                                        <span className={`${chip(isMobile)} text-green-700 border border-green-500/40 bg-green-50 font-bold`}>{room.highestBid}</span>
                                    ) : null}
                                </div>
                            </>
                        )}
                    </div>
                )
            })}

            {showTrickPopup && (
                <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                    <div
                        role="status"
                        className={`pointer-events-auto flex flex-col items-center ${isMobile ? "gap-2 px-6 py-5" : "gap-4 px-10 py-7"} rounded-2xl border border-[#D8D3C5] relative`}
                        style={{
                            background: "rgba(253,252,251,0.85)",
                            backdropFilter: "blur(18px)",
                            WebkitBackdropFilter: "blur(18px)",
                            boxShadow: "0 8px 48px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.02)",
                        }}
                    >
                        {!isHost && (
                            <button
                                onClick={() => setDismissedHand(room.handNumber)}
                                className="absolute top-3 right-4 text-[#8E8980] hover:text-[#2D2A26] transition-colors text-xl font-bold cursor-pointer"
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        )}
                        <div className="text-[13px] tracking-[0.2em] uppercase text-[#8E8980]">hand won</div>
                        <div className={`${isMobile ? "text-xl" : "text-3xl"} text-center text-[#2D2A26]`}>
                            <span className="font-bold" style={{ color: seatColor(room, room.lastTrickWinner) }}>
                                {playerName(room, room.lastTrickWinner)}
                            </span>{" "}
                            won the hand
                        </div>
                        {isHost ? (
                            <button
                                onClick={actions.nextHand}
                                autoFocus
                                className="mt-1 px-8 py-2.5 rounded-xl border border-green-600/40 text-green-700 text-lg font-bold bg-green-50 hover:bg-green-100 transition-all active:scale-95 cursor-pointer"
                            >
                                Next Hand →
                            </button>
                        ) : (
                            <div className="text-[13px] text-[#8E8980]/80 italic">waiting for the host to deal the next hand…</div>
                        )}
                    </div>
                </div>
            )}

            {room.phase === "playing" && room.gameOver && (
                <GameOverOverlay room={room} isHost={isHost} isMobile={isMobile} onPlayAgain={actions.playAgain} onLeave={() => router.push("/")} />
            )}
        </div>
    )
}

interface GameOverProps {
    room: RoomView
    isHost: boolean
    isMobile: boolean
    onPlayAgain: () => void
    onLeave: () => void
}

function GameOverOverlay({ room, isHost, isMobile, onPlayAgain, onLeave }: GameOverProps) {
    const rebels = teamSummary(room, "red")
    const kings = teamSummary(room, "blue")
    // Every point is dealt, so if the Rebels fell short of the bid the Kings stopped them.
    const rebelsWon = rebels.points >= room.highestBid
    const winColor = rebelsWon ? "#DC2626" : "#2563EB"

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center" style={{ background: winColor }}>
            <div className="flex flex-col items-center gap-4 animate-deal-in px-6">
                <div
                    className="text-white font-black tracking-[0.15em] uppercase text-center select-none"
                    style={{ fontSize: isMobile ? "3rem" : "5rem", textShadow: "0 4px 32px rgba(0,0,0,0.3)" }}
                >
                    {rebelsWon ? "Rebels won" : "Kings won"}
                </div>
                <div className="text-white/70 text-lg font-semibold tracking-wide text-center">
                    {rebelsWon
                        ? `Rebels scored ${rebels.points} / ${room.highestBid}`
                        : `Kings scored ${kings.points} / ${kingsTarget(room)}`}
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                    {isHost && (
                        <button
                            onClick={onPlayAgain}
                            className="px-7 py-2.5 rounded-xl bg-white font-bold text-lg shadow-lg hover:bg-white/90 active:scale-95 transition-all cursor-pointer"
                            style={{ color: winColor }}
                        >
                            Play again
                        </button>
                    )}
                    <button
                        onClick={onLeave}
                        className="px-7 py-2.5 rounded-xl border border-white/60 text-white font-bold text-lg hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                    >
                        Leave table
                    </button>
                </div>
                {!isHost && (
                    <div className="text-white/70 text-[14px] italic">the host can start another round</div>
                )}
            </div>
        </div>
    )
}
