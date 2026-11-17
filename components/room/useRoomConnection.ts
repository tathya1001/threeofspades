"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { showNotice } from "@/lib/notice"
import { socket } from "@/lib/socket"
import { readStorage, storageKeys, writeStorage } from "@/lib/storage"
import type { RoomView } from "@/lib/types"

/**
 * Joins the room and keeps the latest server view of it. Rejoins after every
 * reconnect using the seat token saved for this room and name, so a refresh
 * or a dropped connection puts the player straight back in their seat.
 */
export function useRoomConnection(roomId: string, name: string) {
    const router = useRouter()
    const [room, setRoom] = useState<RoomView | null>(null)

    useEffect(() => {
        if (!name) {
            // Arrived from a bare room link: collect a name on the home page first.
            router.replace(`/?join=${encodeURIComponent(roomId)}`)
            return
        }

        const tokenKey = storageKeys.seatToken(roomId, name)
        writeStorage(storageKeys.lastRoom, roomId)
        writeStorage(storageKeys.lastName, name)

        const join = () => socket.emit("join-room", { roomId, name, token: readStorage(tokenKey) ?? undefined })
        const onToken = (token: string) => writeStorage(tokenKey, token)
        const onUpdate = (view: RoomView) => {
            if (view.id === roomId) setRoom(view)
        }
        const onError = (message: string) => {
            showNotice(message)
            router.replace("/")
        }

        socket.on("connect", join)
        socket.on("session-token", onToken)
        socket.on("room-update", onUpdate)
        socket.on("room-error", onError)
        if (socket.connected) join()

        return () => {
            socket.off("connect", join)
            socket.off("session-token", onToken)
            socket.off("room-update", onUpdate)
            socket.off("room-error", onError)
            socket.emit("leave-room", roomId)
        }
    }, [roomId, name, router])

    return room
}
