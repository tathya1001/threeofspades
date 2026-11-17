"use strict"

const { test, before, after } = require("node:test")
const assert = require("node:assert/strict")
const { io: connect } = require("socket.io-client")
const { createGameServer } = require("../server/app")
const game = require("../shared/game")

let server
let url
const clients = []

before(async () => {
    server = createGameServer({ reconnectGraceMs: 200 })
    await new Promise(resolve => server.httpServer.listen(0, resolve))
    url = `http://localhost:${server.httpServer.address().port}`
})

after(async () => {
    for (const client of clients) client.socket.disconnect()
    await new Promise(resolve => server.close(resolve))
})

/** A connected player that remembers the latest room view it received. */
async function player(name) {
    const socket = connect(url, { transports: ["websocket"], forceNew: true, reconnection: false })
    const client = { name, socket, view: null, token: null, errors: [], rawUpdates: [] }
    socket.on("room-update", view => {
        client.view = view
        client.rawUpdates.push(JSON.stringify(view))
    })
    socket.on("session-token", token => { client.token = token })
    socket.on("room-error", message => client.errors.push(message))
    await new Promise(resolve => socket.on("connect", resolve))
    clients.push(client)
    return client
}

async function until(condition, label = "condition") {
    const deadline = Date.now() + 3000
    while (!condition()) {
        if (Date.now() > deadline) throw new Error(`Timed out waiting for ${label}`)
        await new Promise(resolve => setTimeout(resolve, 5))
    }
}

function createRoom(client, settings = {}) {
    return new Promise(resolve => {
        client.socket.emit("create-room", { name: client.name, numPlayers: 4, numDecks: 1, ...settings }, resolve)
    })
}

async function fullTable(names = ["Asha", "Ben", "Cleo", "Dev"]) {
    const players = await Promise.all(names.map(player))
    const { roomId } = await createRoom(players[0])
    for (const p of players) {
        p.socket.emit("join-room", { roomId, name: p.name })
        await until(() => p.view?.selfId, `${p.name} to join`)
    }
    await until(() => players.every(p => p.view.players.length === names.length), "everyone to see a full table")
    return { roomId, players }
}

test("each player only ever sees their own hand", async () => {
    const { roomId, players } = await fullTable()
    const [host] = players
    host.socket.emit("give-cards", roomId)
    await until(() => players.every(p => p.view.cardsDealt), "the deal")

    for (const p of players) {
        assert.equal(p.view.hand.length, 13)
        assert.ok(!("hands" in p.view) && !("playerCards" in p.view))
        for (const other of players) {
            if (other !== p) assert.equal(p.view.cardCounts[other.view.selfId], 13)
        }
    }

    // Nothing that proves seat ownership should ever reach another client.
    for (const p of players) {
        for (const raw of p.rawUpdates) {
            for (const other of players) {
                assert.ok(!raw.includes(other.token), "session tokens must not be broadcast")
                assert.ok(!raw.includes(other.socket.id), "socket ids must not be broadcast")
            }
        }
    }
})

test("a second deal is refused once cards are out", async () => {
    const { roomId, players } = await fullTable(["Ezra", "Fay", "Gus", "Hana"])
    const [host] = players
    host.socket.emit("give-cards", roomId)
    await until(() => host.view.cardsDealt)
    const firstHand = [...host.view.hand]

    const updatesBefore = host.rawUpdates.length
    host.socket.emit("give-cards", roomId)
    host.socket.emit("update-dress", { roomId, dress: "tie" })
    await until(() => host.rawUpdates.length > updatesBefore)
    assert.deepEqual(host.view.hand, firstHand)
})

test("malformed and hostile payloads are ignored without taking the server down", async () => {
    const attacker = await player("Mallory")
    const s = attacker.socket

    s.emit("join-room")
    s.emit("join-room", null)
    s.emit("join-room", { roomId: "__proto__", name: "x" })
    s.emit("create-room", { name: "x", numPlayers: 4, numDecks: 1 })
    s.emit("create-room", { name: "x", numPlayers: 1e9, numDecks: 50 }, () => {})
    s.emit("play-card", null)
    s.emit("place-bid", { roomId: "ABCDEF", amount: "9999" })
    s.emit("confirm-trump", { roomId: "ABCDEF", suit: "__proto__", turningCards: ["__proto__"] })

    const reply = await createRoom(attacker)
    assert.equal(reply.ok, true, "server should still be serving requests")
    assert.equal(Object.prototype.players, undefined, "Object.prototype must stay clean")

    const bad = await new Promise(resolve =>
        s.emit("create-room", { name: "x", numPlayers: 1e9, numDecks: 50 }, resolve))
    assert.equal(bad.ok, false)
})

test("a player can take their seat back with their token, but nobody else can", async () => {
    const { roomId, players } = await fullTable(["Ines", "Jo", "Kai", "Lin"])
    const [host, guest] = players
    host.socket.emit("give-cards", roomId)
    await until(() => guest.view.cardsDealt)

    const seatId = guest.view.selfId
    const hand = [...guest.view.hand]
    const token = guest.token
    guest.socket.disconnect()
    await until(() => host.view.players.find(p => p.id === seatId).offline, "guest to show offline")

    const impostor = await player("Jo")
    impostor.socket.emit("join-room", { roomId, name: "Jo", token: "not-the-token" })
    await until(() => impostor.errors.length > 0)

    const returning = await player("Jo")
    returning.socket.emit("join-room", { roomId, name: "Jo", token })
    await until(() => returning.view?.selfId === seatId, "the original seat")
    assert.deepEqual(returning.view.hand, hand)
})

test("a full game plays out and every point is accounted for", async () => {
    const { roomId, players } = await fullTable(["Mia", "Noor", "Omar", "Pia"])
    const bySeat = id => players.find(p => p.view.selfId === id)
    const [host] = players

    host.socket.emit("give-cards", roomId)
    await until(() => host.view.cardsDealt)
    host.socket.emit("start-bidding", roomId)
    await until(() => host.view.phase === "pre-bidding")

    // Whoever opens bids the minimum; everyone else drops out.
    const opener = host.view.players[host.view.currentBidderIndex]
    bySeat(opener.id).socket.emit("open-bid", { roomId, extra: 0 })
    await until(() => host.view.phase === "bidding")
    while (host.view.phase === "bidding") {
        const turn = host.view.players[host.view.currentBidderIndex]
        const before = host.view.forfeited.length
        bySeat(turn.id).socket.emit("forfeit-bid", roomId)
        await until(() => host.view.forfeited.length > before || host.view.phase !== "bidding")
    }
    assert.equal(host.view.phase, "trump-selection")
    assert.equal(host.view.trumpSelectorId, opener.id)

    const bidder = bySeat(opener.id)
    const partnerCard = game.buildDeck(1).find(card => !bidder.view.hand.includes(card))
    bidder.socket.emit("confirm-trump", { roomId, suit: "spades", turningCards: [partnerCard] })
    await until(() => host.view.phase === "playing")

    while (!host.view.gameOver) {
        if (host.view.trickPending) {
            const hand = host.view.handNumber
            host.socket.emit("next-hand", roomId)
            await until(() => host.view.gameOver || (!host.view.trickPending && host.view.handNumber === hand))
            continue
        }
        const turn = bySeat(host.view.players[host.view.currentPlayerIndex].id)
        const lead = host.view.currentTrick[0]?.card.slice(-1) ?? null
        const card = turn.view.hand.find(c => game.isLegalPlay(turn.view.hand, c, lead))
        const played = host.view.currentTrick.length
        turn.socket.emit("play-card", { roomId, card })
        await until(() => host.view.currentTrick.length !== played || host.view.trickPending)
    }

    const points = Object.values(host.view.playerPoints).reduce((a, b) => a + b, 0)
    const tricks = Object.values(host.view.playerTricks).reduce((a, b) => a + b, 0)
    assert.equal(points, 250)
    assert.equal(tricks, 13)
    assert.ok(Object.values(host.view.playerTeams).includes("red"))
})
