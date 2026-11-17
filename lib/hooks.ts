"use client"

import { useCallback, useState, useSyncExternalStore } from "react"
import { socket } from "./socket"

const noopSubscribe = () => () => {}

/**
 * Reads a browser-only value (localStorage, the URL) without a hydration
 * mismatch: the server render and first client render use `serverValue`,
 * then React swaps in the real one.
 */
export function useClientValue<T extends string | number | boolean | null>(read: () => T, serverValue: T): T {
    return useSyncExternalStore(noopSubscribe, read, () => serverValue)
}

export function useMediaQuery(query: string) {
    const subscribe = useCallback((onChange: () => void) => {
        const list = window.matchMedia(query)
        list.addEventListener("change", onChange)
        return () => list.removeEventListener("change", onChange)
    }, [query])
    return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false)
}

function subscribeToConnection(onChange: () => void) {
    socket.on("connect", onChange)
    socket.on("disconnect", onChange)
    return () => {
        socket.off("connect", onChange)
        socket.off("disconnect", onChange)
    }
}

export function useSocketConnected() {
    return useSyncExternalStore(subscribeToConnection, () => socket.connected, () => true)
}

/** Tracks an element's width. Returns a callback ref to attach and the current width. */
export function useElementWidth<T extends HTMLElement>() {
    const [width, setWidth] = useState(0)
    const ref = useCallback((node: T | null) => {
        if (!node) return
        const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
        observer.observe(node)
        return () => observer.disconnect()
    }, [])
    return [ref, width] as const
}
