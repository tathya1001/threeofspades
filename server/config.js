"use strict"

const MINUTE = 60 * 1000

// CLIENT_URL may hold several comma-separated origins (production plus preview
// deployments, for example). Trailing slashes are dropped so that
// "https://example.app/" and "https://example.app" both match the browser's Origin.
function parseOrigins(value) {
    return value
        .split(",")
        .map(origin => origin.trim().replace(/\/+$/, ""))
        .filter(Boolean)
}

module.exports = {
    port: Number(process.env.PORT) || 3001,
    clientOrigins: parseOrigins(process.env.CLIENT_URL || "http://localhost:3000"),

    // How long a dropped player keeps their lobby seat before it is freed.
    // Once a game is underway seats are held until the room expires.
    reconnectGraceMs: 15 * 1000,

    maxRooms: 500,
    roomSweepIntervalMs: MINUTE,
    // A room nobody ever joined (e.g. the creator closed the tab right away).
    emptyRoomTtlMs: 10 * MINUTE,
    // Everyone is offline: give them a while to come back, then clean up.
    abandonedRoomTtlMs: 30 * MINUTE,
    // Hard cap on any room's lifetime without activity.
    idleRoomTtlMs: 6 * 60 * MINUTE,

    // Per-connection limits. Real play is a handful of events per second at most.
    eventsPerWindow: 40,
    eventWindowMs: 10 * 1000,
    roomCreationsPerWindow: 5,
    roomCreationWindowMs: MINUTE,

    // Every legitimate payload is well under 1 KB.
    maxPayloadBytes: 16 * 1024,
}
