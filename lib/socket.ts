"use client"

import { io } from "socket.io-client"

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"

// One shared connection for the whole app. WebSocket only, which skips the
// long-polling handshake and avoids needing sticky sessions on the server.
export const socket = io(SOCKET_URL, { transports: ["websocket"] })
