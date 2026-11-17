"use client"

import { useState } from "react"
import { inviteUrl } from "@/lib/room"

/** Copies a link that opens the home page with this room code filled in. */
export function InviteButton({ roomId }: { roomId: string }) {
    const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle")

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl(roomId))
            setStatus("copied")
        } catch {
            setStatus("failed")
        }
        setTimeout(() => setStatus("idle"), 2000)
    }

    return (
        <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1 px-2 py-1 rounded-md border border-[#D8D3C5] text-[12px] font-bold text-[#5C5751] hover:border-[#CE670E] hover:text-[#CE670E] transition-colors cursor-pointer"
            aria-live="polite"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
            {status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Invite"}
        </button>
    )
}
