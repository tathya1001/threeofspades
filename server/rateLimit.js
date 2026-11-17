"use strict"

/**
 * Fixed-window counter keyed by connection id. Small and predictable, which is
 * all a game server with short-lived connections needs.
 */
function createRateLimiter({ limit, windowMs }) {
    const windows = new Map()

    return {
        take(key) {
            const now = Date.now()
            const current = windows.get(key)
            if (!current || now - current.startedAt >= windowMs) {
                windows.set(key, { startedAt: now, count: 1 })
                return true
            }
            current.count += 1
            return current.count <= limit
        },
        forget(key) {
            windows.delete(key)
        },
    }
}

module.exports = { createRateLimiter }
