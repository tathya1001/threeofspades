"use strict"

const { randomInt, randomBytes } = require("crypto")

const ROOM_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const ROOM_CODE_LENGTH = 6

// Shuffling uses the crypto RNG. Math.random is fast but its internal state
// can be reconstructed from enough outputs, which matters for a card game.
function shuffle(items) {
    const result = [...items]
    for (let i = result.length - 1; i > 0; i--) {
        const j = randomInt(i + 1)
        const held = result[i]
        result[i] = result[j]
        result[j] = held
    }
    return result
}

function pick(items) {
    return items[randomInt(items.length)]
}

// Seat ids are public (every client sees them); the per-seat token is what
// proves ownership on reconnect.
function newSeatId() {
    return randomBytes(6).toString("base64url")
}

function newRoomCode() {
    let code = ""
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]
    return code
}

/** Clears everything tied to a single deal, leaving the table and players intact. */
function resetRound(room) {
    Object.assign(room, {
        phase: "waiting",
        cardsDealt: false,
        hands: {},
        setAside: [],
        cardsPerPlayer: 0,

        highestBid: room.minBid - 5,
        highestBidderId: null,
        currentBidderIndex: 0,
        forfeited: [],
        numPartners: 0,

        trumpSuit: null,
        trumpSelectorId: null,
        turningCards: [],
        turningCardPriorities: null,
        turningCardPlayCounts: {},

        currentPlayerIndex: 0,
        currentTrick: [],
        handNumber: 0,
        playerTricks: {},
        playerPoints: {},
        playerTeams: {},
        lastTrickWinner: null,
        trickPending: false,
        gameOver: false,
    })
    return room
}

function createRoom(id, settings) {
    const now = Date.now()
    return resetRound({
        id,
        createdAt: now,
        updatedAt: now,
        roundNumber: 0,

        targetPlayers: settings.numPlayers,
        numDecks: settings.numDecks,
        isCustomRule: settings.isCustomRule,
        maxPoints: settings.maxPoints,
        minBid: settings.minBid,
        partnerThresholds: settings.partnerThresholds,

        hostId: null,
        // { id, socketId, name, token, offline }
        players: [],
        playerColors: {},
        playerDresses: {},
    })
}

/**
 * What one player is allowed to see. Built field by field so that server-only
 * state (other hands, session tokens, socket ids) can never leak by accident.
 */
function roomView(room, seatId) {
    return {
        id: room.id,
        selfId: seatId,
        phase: room.phase,
        hostId: room.hostId,

        targetPlayers: room.targetPlayers,
        numDecks: room.numDecks,
        isCustomRule: room.isCustomRule,
        maxPoints: room.maxPoints,
        minBid: room.minBid,
        partnerThresholds: room.partnerThresholds,

        players: room.players.map(({ id, name, offline }) => ({ id, name, offline })),
        playerColors: room.playerColors,
        playerDresses: room.playerDresses,

        cardsDealt: room.cardsDealt,
        cardsPerPlayer: room.cardsPerPlayer,
        hand: room.hands[seatId] ?? [],
        cardCounts: Object.fromEntries(room.players.map(p => [p.id, room.hands[p.id]?.length ?? 0])),

        highestBid: room.highestBid,
        highestBidderId: room.highestBidderId,
        currentBidderIndex: room.currentBidderIndex,
        forfeited: room.forfeited,
        numPartners: room.numPartners,

        trumpSuit: room.trumpSuit,
        trumpSelectorId: room.trumpSelectorId,
        turningCards: room.turningCards,
        turningCardPriorities: room.turningCardPriorities,

        currentPlayerIndex: room.currentPlayerIndex,
        currentTrick: room.currentTrick,
        handNumber: room.handNumber,
        playerTricks: room.playerTricks,
        playerPoints: room.playerPoints,
        playerTeams: room.playerTeams,
        lastTrickWinner: room.lastTrickWinner,
        trickPending: room.trickPending,
        gameOver: room.gameOver,
    }
}

class RoomStore {
    constructor({ maxRooms }) {
        this.rooms = new Map()
        this.maxRooms = maxRooms
    }

    get size() {
        return this.rooms.size
    }

    get(id) {
        return this.rooms.get(id) ?? null
    }

    values() {
        return this.rooms.values()
    }

    /** Returns null when the server is at capacity. */
    create(settings) {
        if (this.rooms.size >= this.maxRooms) return null
        let id = newRoomCode()
        while (this.rooms.has(id)) id = newRoomCode()
        const room = createRoom(id, settings)
        this.rooms.set(id, room)
        return room
    }

    delete(id) {
        this.rooms.delete(id)
    }

    /** Drops rooms that were never joined, were abandoned, or went idle. Returns their ids. */
    sweep(now, { emptyRoomTtlMs, abandonedRoomTtlMs, idleRoomTtlMs }) {
        const expired = []
        for (const room of this.rooms.values()) {
            const idleFor = now - room.updatedAt
            const ttl = room.players.length === 0
                ? emptyRoomTtlMs
                : room.players.every(p => p.offline) ? abandonedRoomTtlMs : idleRoomTtlMs
            if (idleFor > ttl) expired.push(room.id)
        }
        for (const id of expired) this.rooms.delete(id)
        return expired
    }
}

module.exports = {
    RoomStore,
    resetRound,
    roomView,
    shuffle,
    pick,
    newSeatId,
}
