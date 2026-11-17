"use client"

import { useSyncExternalStore } from "react"

// A one-off message carried across a client-side navigation, e.g. "room not
// found" when the room page bounces a player back home. Lives in memory only,
// so it can't be spoofed through a crafted link.

let message: string | null = null
const listeners = new Set<() => void>()

function emit() {
    for (const listener of listeners) listener()
}

export function showNotice(text: string) {
    message = text
    emit()
}

export function clearNotice() {
    if (message === null) return
    message = null
    emit()
}

function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

export function useNotice() {
    return useSyncExternalStore(subscribe, () => message, () => null)
}
