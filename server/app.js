"use strict"

const http = require("http")
const { Server } = require("socket.io")
const defaultConfig = require("./config")
const { RoomStore } = require("./rooms")
const { createConnectionHandler } = require("./handlers")

/**
 * Builds the HTTP + Socket.IO server without starting it, so tests can run
 * the real thing on a random port.
 */
function createGameServer(overrides = {}) {
    const config = { ...defaultConfig, ...overrides }
    const store = new RoomStore({ maxRooms: config.maxRooms })

    // Socket.IO handles its own path; everything else lands here. /health is
    // what the hosting platform pings to decide whether the service is up.
    const httpServer = http.createServer((req, res) => {
        if (req.url === "/health") {
            res.writeHead(200, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ status: "ok" }))
            return
        }
        res.writeHead(404)
        res.end()
    })

    const io = new Server(httpServer, {
        cors: { origin: config.clientOrigins, methods: ["GET", "POST"] },
        maxHttpBufferSize: config.maxPayloadBytes,
    })
    io.on("connection", createConnectionHandler({ io, store, config }))

    const sweeper = setInterval(() => {
        for (const id of store.sweep(Date.now(), config)) console.log(`room ${id} expired`)
    }, config.roomSweepIntervalMs)
    sweeper.unref()

    return {
        httpServer,
        io,
        store,
        close(callback) {
            clearInterval(sweeper)
            io.close(callback)
        },
    }
}

module.exports = { createGameServer }
