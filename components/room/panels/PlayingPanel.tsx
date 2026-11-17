import { rankLabel, SUIT_INFO, TRUMP_OPTIONS } from "@/lib/cards"
import { kingsTarget, seatColor, teamSummary } from "@/lib/room"
import type { RoomView, Team } from "@/lib/types"
import { AvatarIcon } from "../../AvatarIcon"

function TurningCardBadge({ card, priority }: { card: string; priority?: number }) {
    const suit = SUIT_INFO[card.slice(-1)]
    return (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#D8D3C5] bg-[#FAF7F2] min-w-[56px]">
            <span style={{ color: suit.color, fontSize: "15px", lineHeight: 1 }}>{suit.symbol}</span>
            <span className="text-[15px] font-bold" style={{ color: suit.color }}>{rankLabel(card.slice(0, -1))}</span>
            {priority != null && <span className="text-[12px] text-[#8E8980] font-semibold">({priority})</span>}
        </div>
    )
}

function TeamScore({ room, team }: { room: RoomView; team: Team }) {
    const { members, points, tricks } = teamSummary(room, team)
    const isRebels = team === "red"
    const tone = isRebels ? "text-red-600" : "text-blue-600"
    const target = isRebels ? room.highestBid : kingsTarget(room)
    const currentPlayerId = room.players[room.currentPlayerIndex]?.id

    return (
        <div>
            <div className="flex justify-between items-end mb-1.5">
                <div>
                    <div className={`text-[11px] ${tone} opacity-90 font-bold tracking-wider uppercase`}>{isRebels ? "Rebels" : "Kings"}</div>
                    <div className={`text-[20px] font-bold ${tone} mt-0.5`}>
                        {points} <span className="text-[13px] font-normal text-[#8E8980]">/ {target}</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`text-[11px] ${tone} opacity-90 font-bold tracking-wider uppercase`}>hands</div>
                    <div className="text-lg font-bold">{tricks}</div>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
                {members.map(p => (
                    <div
                        key={p.id}
                        title={p.name}
                        className={`flex items-center justify-center w-[30px] h-[30px] rounded ${currentPlayerId === p.id ? "ring-1 ring-[#CE670E]" : ""}`}
                    >
                        <AvatarIcon dress={room.playerDresses[p.id]} color={seatColor(room, p.id)} size={28} />
                    </div>
                ))}
            </div>
        </div>
    )
}

export function PlayingPanel({ room }: { room: RoomView }) {
    const trump = TRUMP_OPTIONS.find(option => option.value === room.trumpSuit)
    // The counter ticks over as soon as a trick completes; don't show "14/13" on the last one.
    const handShown = Math.min(room.handNumber, room.cardsPerPlayer)

    return (
        <div className="flex flex-col gap-3.5">
            {trump && (
                <div>
                    <div className="text-[13px] text-[#8E8980] mb-1">trump suit</div>
                    <div className={`flex items-center gap-2.5 p-3 border rounded-xl bg-[#FAF7F2]/60 ${trump.border}`}>
                        <span className={`text-4xl leading-none ${trump.color}`}>{trump.symbol}</span>
                        <span className={`text-xl font-bold ${trump.color}`}>{trump.label}</span>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center text-[#2D2A26]">
                <div>
                    <div className="text-[13px] text-[#8E8980]">hand</div>
                    <div className="text-2xl font-bold">{handShown}/{room.cardsPerPlayer}</div>
                </div>
                <div>
                    <div className="text-[13px] text-[#8E8980]">bid</div>
                    <div className="text-2xl font-bold">{room.highestBid}</div>
                </div>
                <div className="text-right">
                    <div className="text-[13px] text-[#8E8980]">partners</div>
                    <div className="text-2xl font-bold">{room.numPartners}</div>
                </div>
            </div>

            {room.turningCards.length > 0 && (
                <>
                    <div className="w-full h-px bg-[#E5E0D5]" />
                    <div>
                        <div className="text-[13px] text-[#8E8980] mb-2">turning cards</div>
                        <div className="flex flex-wrap gap-2">
                            {room.turningCards.map((card, i) => (
                                <TurningCardBadge key={`${card}-${i}`} card={card} priority={room.turningCardPriorities?.[i]} />
                            ))}
                        </div>
                    </div>
                </>
            )}

            <div className="w-full h-px bg-[#E5E0D5]" />

            <div className="flex flex-col gap-4">
                <TeamScore room={room} team="blue" />
                <div className="w-full h-px bg-[#E5E0D5]" />
                <TeamScore room={room} team="red" />
            </div>
        </div>
    )
}
