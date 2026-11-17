"use client"

import { useEffect, useState } from "react"
import { useSocketConnected } from "@/lib/hooks"

// The game server can sleep when idle and take a while to wake, so after a
// short wait the message explains the delay instead of leaving players guessing.
const SLOW_CONNECT_MS = 4000

export function useSlowConnection() {
    const connected = useSocketConnected()
    const [waitedLong, setWaitedLong] = useState(false)

    useEffect(() => {
        if (connected) return
        const timer = setTimeout(() => setWaitedLong(true), SLOW_CONNECT_MS)
        return () => clearTimeout(timer)
    }, [connected])

    return { connected, slow: !connected && waitedLong }
}

/** Thin banner shown while the socket is down after the room has loaded. */
export function ReconnectingBanner() {
    const { connected, slow } = useSlowConnection()
    if (connected) return null
    return (
        <div role="status" className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full border border-orange-400/40 bg-orange-50 text-orange-700 text-[13px] font-semibold shadow-md">
            {slow ? "Still reconnecting… your seat is being held" : "Reconnecting…"}
        </div>
    )
}

export function JoiningScreen({ roomId }: { roomId: string }) {
    const { slow } = useSlowConnection()
    return (
        <div className="flex flex-col items-center justify-center gap-3 w-screen h-screen bg-[#FAF7F2] text-[#2D2A26] px-6 text-center">
            <div className="text-[13px] text-[#8E8980] tracking-[0.2em] uppercase">room {roomId}</div>
            <div className="text-2xl font-bold animate-pulse">Taking your seat…</div>
            {slow && (
                <p className="text-[#8E8980] max-w-[340px] leading-relaxed">
                    The game server is waking up. The first connection after a quiet spell can take up to a minute.
                </p>
            )}
        </div>
    )
}
