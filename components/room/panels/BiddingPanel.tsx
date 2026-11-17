import { playerName, type RoomActions } from "@/lib/room"
import type { RoomView } from "@/lib/types"
import { PartnerLadder } from "../PartnerLadder"

const RAISES = [5, 10, 15, 20]

export function BiddingPanel({ room, isMyTurn, actions }: { room: RoomView; isMyTurn: boolean; actions: RoomActions }) {
    const iForfeited = room.forfeited.includes(room.selfId)

    return (
        <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {([["max pts", room.maxPoints], ["hands", room.cardsPerPlayer]] as const).map(([label, value]) => (
                    <div key={label} className="flex flex-col">
                        <span className="text-[12px] text-[#8E8980]">{label}</span>
                        <span className="text-[22px] font-bold leading-tight">{value}</span>
                    </div>
                ))}
            </div>

            <div>
                <div className="text-[13px] text-[#8E8980]">highest bid</div>
                <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-bold leading-none text-4xl text-[#CE670E]">{room.highestBid}</span>
                    <span className="text-sm text-[#8E8980]">by {playerName(room, room.highestBidderId)}</span>
                </div>
            </div>

            <PartnerLadder thresholds={room.partnerThresholds} currentBid={room.highestBid} />

            <div className="w-full h-px bg-[#E5E0D5]" />

            {iForfeited ? (
                <p className="text-[#8E8980] text-lg italic">you forfeited.</p>
            ) : (
                <div className="flex flex-col gap-2.5">
                    <div className="grid grid-cols-2 gap-2">
                        {RAISES.map(raise => {
                            const amount = room.highestBid + raise
                            return (
                                <button
                                    key={raise}
                                    onClick={() => actions.placeBid(amount)}
                                    disabled={!isMyTurn || amount > room.maxPoints}
                                    title={`Bid ${amount}`}
                                    className="py-2.5 border border-[#D8D3C5] rounded-lg text-[#2D2A26] bg-[#FDFCFB] text-xl font-semibold hover:bg-[#EBE7DC] disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                >
                                    +{raise}
                                </button>
                            )
                        })}
                    </div>
                    <button
                        onClick={actions.forfeitBid}
                        disabled={!isMyTurn}
                        className="w-full py-2.5 border border-red-500/40 rounded-lg text-red-600 bg-red-50 font-bold hover:bg-red-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                        Forfeit
                    </button>
                    {!isMyTurn && (
                        <p className="text-[12px] text-[#8E8980] -mt-1 text-center">
                            {playerName(room, room.players[room.currentBidderIndex]?.id)} is deciding…
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
