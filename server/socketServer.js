"use strict"

// Entry point for the realtime game server. It runs as its own service,
// separate from the Next.js front end.

const config = require("./config")
const { createGameServer } = require("./app")

const server = createGameServer()

server.httpServer.listen(config.port, () => {
    console.log(`Game server listening on port ${config.port}, accepting ${config.clientOrigins.join(", ")}`)
})

// Hosting platforms send SIGTERM before replacing an instance during a deploy.
// Close sockets cleanly so clients see a normal disconnect and reconnect to
// the new instance.
function shutdown(signal) {
    console.log(`${signal} received, shutting down`)
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(1), 5000).unref()
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
