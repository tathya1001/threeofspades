import { setAsideCards } from "@/shared/game"
import { rankLabel, SUIT_INFO } from "@/lib/cards"
import { playerName, type RoomActions } from "@/lib/room"
import type { RoomView } from "@/lib/types"
import { PartnerLadder } from "../PartnerLadder"

export function WaitingPanel({ room, isHost, actions }: { room: RoomView; isHost: boolean; actions: RoomActions }) {
    const seatsLeft = room.targetPlayers - room.players.length
    const tableFull = seatsLeft === 0
    const setAside = setAsideCards(room.targetPlayers, room.numDecks)

    const stats: [string, string][] = [
        ["players", `${room.players.length} / ${room.targetPlayers}`],
        ["decks", String(room.numDecks)],
        ["min bid", String(room.minBid)],
    ]

    return (
        <>
            {room.isCustomRule && (
                <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#CE670E]/30 bg-[#CE670E]/8 self-start">
                    <span className="text-[12px] font-bold text-[#CE670E]/80 tracking-wider uppercase">custom rules</span>
                </div>
            )}
            <div className="flex flex-col gap-2.5">
                {isHost && (
                    <button
                        onClick={actions.dealCards}
                        disabled={!tableFull || room.cardsDealt}
                        className={`w-full py-2.5 rounded-lg text-[1.1rem] font-bold transition-all ${room.cardsDealt
                            ? "border border-green-500/30 text-green-700 bg-green-50/50 cursor-default"
                            : "border border-red-500/40 text-red-600 bg-red-50 hover:bg-red-100/50 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            }`}
                    >
                        {room.cardsDealt ? "✓ Cards Dealt" : "Give Cards"}
                    </button>
                )}
                {!isHost && room.cardsDealt && (
                    <div className="text-[13px] text-green-700 border border-green-500/20 rounded-lg px-3 py-2 bg-green-50 text-center font-semibold">
                        ✓ Cards dealt
                    </div>
                )}

                {(isHost || room.cardsDealt) && <div className="w-full h-px bg-[#E5E0D5] my-1" />}

                {stats.map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center">
                        <span className="text-[13px] text-[#8E8980]">{label}</span>
                        <span className="text-xl font-semibold">{value}</span>
                    </div>
                ))}

                {setAside.length > 0 && (
                    <div className="flex justify-between items-center gap-3" title="Removed before dealing so everyone gets the same number of cards">
                        <span className="text-[13px] text-[#8E8980] shrink-0">set aside</span>
                        <span className="text-[14px] font-semibold text-right">
                            {setAside.map((card, i) => {
                                const suit = SUIT_INFO[card.slice(-1)]
                                return (
                                    <span key={`${card}-${i}`} className="ml-1.5 whitespace-nowrap">
                                        {rankLabel(card.slice(0, -1))}<span style={{ color: suit.color }}>{suit.symbol}</span>
                                    </span>
                                )
                            })}
                        </span>
                    </div>
                )}

                {room.partnerThresholds.length > 0 && (
                    <>
                        <div className="w-full h-px bg-[#E5E0D5] my-1" />
                        <div className="text-[13px] text-[#8E8980] mb-1">partner thresholds</div>
                        <PartnerLadder thresholds={room.partnerThresholds} currentBid={room.minBid} />
                    </>
                )}

                <div className="mt-2.5">
                    {isHost ? (
                        <button
                            onClick={actions.startBidding}
                            disabled={!tableFull || !room.cardsDealt}
                            className="w-full py-3 border border-[#CE670E]/50 rounded-lg text-[#CE670E] font-bold text-xl hover:bg-[#CE670E]/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                            {seatsLeft > 0 ? `need ${seatsLeft} more` : !room.cardsDealt ? "deal cards first" : "start bidding"}
                        </button>
                    ) : (
                        <p className="text-[#8E8980] text-base italic leading-relaxed">
                            waiting for <span className="text-[#2D2A26] font-semibold">{playerName(room, room.hostId)}</span> to start...
                        </p>
                    )}
                </div>
            </div>
        </>
    )
}
