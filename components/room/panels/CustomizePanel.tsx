import { AVATAR_COLORS } from "@/shared/avatars"
import { seatColor, type RoomActions } from "@/lib/room"
import type { AvatarStyle, RoomView } from "@/lib/types"
import { AvatarIcon } from "../../AvatarIcon"

const AVATAR_DRESSES: { id: AvatarStyle; label: string }[] = [
    { id: "ninja", label: "Ninja" },
    { id: "default", label: "Classic" },
    { id: "tie", label: "Tie" },
]

const selectedTile = "border-[#CE670E] scale-105 shadow-[0_0_14px_rgba(20,58,108,0.25)] z-10"

export function CustomizePanel({ room, actions, onDone }: { room: RoomView; actions: RoomActions; onDone: () => void }) {
    const myColor = room.playerColors[room.selfId]
    const myDress = room.playerDresses[room.selfId] ?? "default"

    return (
        <div className="flex flex-col gap-3">
            <div className="text-[13px] text-[#8E8980] mb-1">choose color</div>
            <div className="grid grid-cols-3 gap-3">
                {AVATAR_COLORS.map(color => {
                    const isMine = myColor === color
                    const isTaken = !isMine && Object.values(room.playerColors).includes(color)
                    return (
                        <button
                            key={color}
                            onClick={() => actions.setColor(color)}
                            disabled={isTaken}
                            aria-label={isTaken ? "Colour taken" : "Choose colour"}
                            aria-pressed={isMine}
                            className={`relative w-full flex items-center justify-center aspect-square rounded-[14px] border-2 transition-all duration-200 ${isMine
                                ? selectedTile
                                : isTaken
                                    ? "border-transparent opacity-30 grayscale-[0.6] cursor-not-allowed"
                                    : "border-transparent opacity-60 hover:opacity-100 hover:scale-105 hover:border-black/30 cursor-pointer"
                                }`}
                            style={{ backgroundColor: color }}
                        >
                            {isTaken && <span className="text-white/80 font-bold text-2xl drop-shadow-md">×</span>}
                        </button>
                    )
                })}
            </div>

            <div className="w-full h-px bg-[#E5E0D5] my-2" />

            <div className="text-[13px] text-[#8E8980] mb-1">choose dress</div>
            <div className="grid grid-cols-3 gap-3">
                {AVATAR_DRESSES.map(dress => {
                    const isSelected = myDress === dress.id
                    return (
                        <button
                            key={dress.id}
                            onClick={() => actions.setDress(dress.id)}
                            aria-label={dress.label}
                            aria-pressed={isSelected}
                            className={`relative w-full flex items-center justify-center aspect-square rounded-[14px] border-2 transition-all duration-200 bg-[#FAF7F2] ${isSelected
                                ? selectedTile
                                : "border-transparent opacity-60 hover:opacity-100 hover:scale-105 hover:border-black/20 cursor-pointer"
                                }`}
                        >
                            <AvatarIcon dress={dress.id} color={seatColor(room, room.selfId)} size={40} />
                        </button>
                    )
                })}
            </div>

            <div className="w-full h-px bg-[#E5E0D5] my-2" />
            <button
                onClick={onDone}
                className="w-full py-2.5 border border-[#D8D3C5] rounded-lg text-[#2D2A26] text-lg font-bold hover:bg-[#FAF7F2] transition-colors cursor-pointer"
            >
                Done
            </button>
        </div>
    )
}
