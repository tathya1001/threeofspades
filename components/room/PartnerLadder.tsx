import type { PartnerThreshold } from "@/lib/types"

/** Bid needed for each partner count, highlighting the level the current bid has reached. */
export function PartnerLadder({ thresholds, currentBid }: { thresholds: PartnerThreshold[]; currentBid: number }) {
    if (!thresholds.length) return null
    return (
        <div className="flex flex-col gap-1.5">
            {thresholds.map(({ partners, threshold }) => {
                const reached = currentBid >= threshold
                const next = thresholds.find(t => t.partners === partners + 1)
                const isCurrent = reached && (!next || currentBid < next.threshold)
                const tone = isCurrent ? "text-[#CE670E]" : reached ? "text-green-700" : "text-[#8E8980]"
                return (
                    <div
                        key={partners}
                        className={`flex items-center justify-between rounded-lg px-3 py-1.5 border transition-all duration-200 ${isCurrent
                            ? "border-[#CE670E]/50 bg-[#CE670E]/10"
                            : reached ? "border-green-600/40 bg-green-600/8" : "border-[#D8D3C5] opacity-60"
                            }`}
                    >
                        <span className={`text-[13px] ${tone} ${isCurrent ? "font-semibold" : ""}`}>
                            {partners} partner{partners !== 1 ? "s" : ""}
                            <span className="ml-1 opacity-60">· {partners} card{partners !== 1 ? "s" : ""}</span>
                        </span>
                        <span className={`text-[15px] font-bold tabular-nums ${tone}`}>{threshold}</span>
                    </div>
                )
            })}
        </div>
    )
}
