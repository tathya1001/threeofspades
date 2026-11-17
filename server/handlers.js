"use strict"

const { randomUUID, timingSafeEqual } = require("crypto")
const game = require("../shared/game")
const { AVATAR_COLORS, AVATAR_STYLES } = require("../shared/avatars")
const v = require("./validate")
const { createRateLimiter } = require("./rateLimit")
const { resetRound, roomView, shuffle, pick, newSeatId } = require("./rooms")

function tokensMatch(given, expected) {
    const a = Buffer.from(given)
    const b = Buffer.from(expected)
    return a.length === b.length && timingSafeEqual(a, b)
}

function createConnectionHandler({ io, store, config }) {
    const eventLimiter = createRateLimiter({ limit: config.eventsPerWindow, windowMs: config.eventWindowMs })
    const creationLimiter = createRateLimiter({ limit: config.roomCreationsPerWindow, windowMs: config.roomCreationWindowMs })
    const graceTimers = new Map()

    // Each player gets their own view of the room, so a broadcast is one emit per seat.
    function broadcast(room) {
        room.updatedAt = Date.now()
        for (const seat of room.players) {
            if (!seat.offline) io.to(seat.socketId).emit("room-update", roomView(room, seat.id))
        }
    }

    const seatBySocket = (room, socketId) => room.players.find(p => p.socketId === socketId) ?? null
    const isHost = (room, seat) => room.hostId === seat.id
    const activeBidders = room => room.players.filter(p => !room.forfeited.includes(p.id))
    const leadSuit = room => (room.currentTrick.length ? game.suitOf(room.currentTrick[0].card) : null)

    function graceKey(room, seat) {
        return `${room.id}:${seat.id}`
    }

    function cancelGrace(room, seat) {
        const key = graceKey(room, seat)
        clearTimeout(graceTimers.get(key))
        graceTimers.delete(key)
    }

    function handOffHost(room) {
        const next = room.players.find(p => !p.offline) ?? room.players[0]
        if (next) room.hostId = next.id
    }

    function removeSeat(room, seat) {
        room.players = room.players.filter(p => p !== seat)
        delete room.playerColors[seat.id]
        delete room.playerDresses[seat.id]

        if (room.players.length === 0) {
            store.delete(room.id)
            console.log(`room ${room.id} closed, everyone left`)
            return
        }
        // The hands were cut for a full table. Once someone else sits down the
        // host deals again.
        if (room.cardsDealt) {
            room.hands = {}
            room.setAside = []
            room.cardsPerPlayer = 0
            room.cardsDealt = false
        }
        if (isHost(room, seat)) handOffHost(room)
        broadcast(room)
    }

    // In the lobby a dropped player's seat is freed after the grace period so
    // the table can fill. Mid-game the seat is held (the game can't continue
    // without their cards); only the host role moves on if the host vanishes.
    function startGrace(room, seat) {
        cancelGrace(room, seat)
        const timer = setTimeout(() => {
            graceTimers.delete(graceKey(room, seat))
            if (store.get(room.id) !== room || !seat.offline || !room.players.includes(seat)) return

            if (room.phase === "waiting") {
                removeSeat(room, seat)
            } else if (isHost(room, seat)) {
                handOffHost(room)
                broadcast(room)
            }
        }, config.reconnectGraceMs)
        timer.unref()
        graceTimers.set(graceKey(room, seat), timer)
    }

    function goOffline(room, seat) {
        if (seat.offline) return
        seat.offline = true
        broadcast(room)
        startGrace(room, seat)
    }

    function advanceBidder(room) {
        if (activeBidders(room).length === 0) return
        let next = room.currentBidderIndex
        do {
            next = (next + 1) % room.players.length
        } while (room.forfeited.includes(room.players[next].id))
        room.currentBidderIndex = next
    }

    // Bidding ends as soon as a single bidder is left standing.
    function settleBiddingIfDecided(room) {
        if (activeBidders(room).length !== 1) return false
        room.phase = "trump-selection"
        room.trumpSelectorId = room.highestBidderId
        return true
    }

    function pickFreeColor(room) {
        const taken = new Set(Object.values(room.playerColors))
        const free = AVATAR_COLORS.filter(c => !taken.has(c))
        return pick(free.length ? free : AVATAR_COLORS)
    }

    function revealPartner(room, seat, card) {
        if (!room.turningCards.includes(card)) return

        const playCount = (room.turningCardPlayCounts[card] ?? 0) + 1
        room.turningCardPlayCounts[card] = playCount

        if (!room.turningCardPriorities) {
            room.playerTeams[seat.id] = "red"
            return
        }
        // With two decks the bidder names which copy counts: the 1st or 2nd
        // time it is played, or 0 for "the copy I'm not holding".
        room.turningCards.forEach((turningCard, i) => {
            if (turningCard !== card) return
            const priority = room.turningCardPriorities[i]
            const matches = priority === 0 ? seat.id !== room.highestBidderId : priority === playCount
            if (matches) room.playerTeams[seat.id] = "red"
        })
    }

    function completeTrick(room) {
        const winner = game.trickWinner(room.currentTrick, game.TRUMP_SUITS[room.trumpSuit])
        const points = room.currentTrick.reduce((sum, entry) => sum + game.cardPoints(entry.card), 0)

        room.playerPoints[winner.playerId] += points
        room.playerTricks[winner.playerId] += 1
        room.lastTrickWinner = winner.playerId
        room.currentPlayerIndex = room.players.findIndex(p => p.id === winner.playerId)
        // The finished trick stays on the table until the host moves on.
        room.trickPending = true
        room.handNumber += 1
    }

    return function onConnection(socket) {
        socket.data.roomIds = new Set()

        // Every handler is rate limited and isolated: a malformed payload
        // should cost one ignored event, never the whole process.
        function on(event, handler) {
            socket.on(event, (...args) => {
                if (!eventLimiter.take(socket.id)) return
                try {
                    handler(...args)
                } catch (error) {
                    console.error(`"${event}" handler failed:`, error)
                }
            })
        }

        // Resolves the room and the caller's seat for room-scoped events.
        function seatIn(payload) {
            const roomId = v.roomIdFrom(payload)
            const room = roomId ? store.get(roomId) : null
            const seat = room ? seatBySocket(room, socket.id) : null
            return seat ? { room, seat } : {}
        }

        function bringOnline(room, seat) {
            cancelGrace(room, seat)
            seat.offline = false
            socket.data.roomIds.add(room.id)
            broadcast(room)
        }

        function reclaimSeat(room, seat) {
            const previousSocketId = seat.socketId
            seat.socketId = socket.id
            if (previousSocketId !== socket.id) {
                // Same seat opened somewhere new (another tab, another device).
                // Tell the old one instead of leaving it on a frozen table.
                io.sockets.sockets.get(previousSocketId)?.data.roomIds?.delete(room.id)
                io.to(previousSocketId).emit("room-error", "This seat was opened in another tab or device.")
            }
            bringOnline(room, seat)
        }

        on("create-room", (payload, ack) => {
            const reply = typeof ack === "function" ? ack : () => {}

            if (!creationLimiter.take(socket.id)) {
                return reply({ ok: false, error: "You're creating rooms too quickly. Try again in a minute." })
            }
            const settings = v.parseRoomSettings(payload)
            if (!settings.ok) return reply({ ok: false, error: settings.error })

            const room = store.create(settings.value)
            if (!room) return reply({ ok: false, error: "The server is full right now. Please try again shortly." })

            const { numPlayers, numDecks, isCustomRule, minBid } = settings.value
            console.log(`room ${room.id} created: ${numPlayers} players, ${numDecks} deck(s), ${isCustomRule ? "custom" : "standard"} rules, min bid ${minBid}`)
            reply({ ok: true, roomId: room.id })
        })

        on("join-room", payload => {
            const request = v.parseJoin(payload)
            if (!request.ok) return socket.emit("room-error", request.error)

            const { roomId, name, token } = request.value
            const room = store.get(roomId)
            if (!room) return socket.emit("room-error", "That room doesn't exist or has already closed.")

            const existing = seatBySocket(room, socket.id)
            if (existing) return bringOnline(room, existing)

            const namesake = room.players.find(p => p.name.toLowerCase() === name.toLowerCase())
            if (namesake) {
                if (!token || !tokensMatch(token, namesake.token)) {
                    return socket.emit("room-error", "Someone at this table already has that name.")
                }
                return reclaimSeat(room, namesake)
            }

            if (room.phase !== "waiting") return socket.emit("room-error", "This game has already started.")
            if (room.players.length >= room.targetPlayers) return socket.emit("room-error", "This table is full.")

            const seat = { id: newSeatId(), socketId: socket.id, name, token: randomUUID(), offline: false }
            room.players.push(seat)
            room.playerColors[seat.id] = pickFreeColor(room)
            room.playerDresses[seat.id] = pick(AVATAR_STYLES)
            // The creator joins straight after creating the room, so the first
            // seat taken is theirs.
            if (!room.hostId) room.hostId = seat.id

            socket.data.roomIds.add(room.id)
            socket.emit("session-token", seat.token)
            broadcast(room)
        })

        on("leave-room", payload => {
            const { room, seat } = seatIn(payload)
            if (!seat) return
            socket.data.roomIds.delete(room.id)
            goOffline(room, seat)
        })

        on("update-color", payload => {
            const { room, seat } = seatIn(payload)
            if (!seat || !AVATAR_COLORS.includes(payload.color)) return
            const takenByOther = Object.entries(room.playerColors).some(([id, color]) => id !== seat.id && color === payload.color)
            if (takenByOther) return
            room.playerColors[seat.id] = payload.color
            broadcast(room)
        })

        on("update-dress", payload => {
            const { room, seat } = seatIn(payload)
            if (!seat || !AVATAR_STYLES.includes(payload.dress)) return
            room.playerDresses[seat.id] = payload.dress
            broadcast(room)
        })

        on("give-cards", payload => {
            const { room, seat } = seatIn(payload)
            if (!seat || !isHost(room, seat)) return
            if (room.phase !== "waiting" || room.cardsDealt || room.players.length !== room.targetPlayers) return

            const setAside = game.setAsideCards(room.players.length, room.numDecks)
            const deck = shuffle(game.buildDeck(room.numDecks, setAside))
            const perPlayer = deck.length / room.players.length

            room.hands = {}
            room.players.forEach((player, i) => {
                room.hands[player.id] = deck.slice(i * perPlayer, (i + 1) * perPlayer)
            })
            room.setAside = setAside
            room.cardsPerPlayer = perPlayer
            room.cardsDealt = true

            console.log(`room ${room.id}: dealt ${perPlayer} cards each, ${setAside.length} set aside`)
            broadcast(room)
        })

        on("start-bidding", payload => {
            const { room, seat } = seatIn(payload)
            if (!seat || !isHost(room, seat)) return
            if (room.phase !== "waiting" || !room.cardsDealt || room.players.length !== room.targetPlayers) return

            room.phase = "pre-bidding"
            room.highestBid = room.minBid - game.BID_STEP
            room.highestBidderId = null
            room.forfeited = []
            room.numPartners = 0
            // Rotate who opens so the same player doesn't always go first.
            room.currentBidderIndex = room.roundNumber % room.players.length
            broadcast(room)
        })

        // Opening round: each player in turn either opens the bidding or passes.
        on("pass-prebid", payload => {
            const { room, seat } = seatIn(payload)
            if (!seat || room.phase !== "pre-bidding") return
            if (room.players[room.currentBidderIndex]?.id !== seat.id) return

            advanceBidder(room)
            broadcast(room)
        })

        on("open-bid", payload => {
            const { room, seat } = seatIn(payload)
            if (!seat || room.phase !== "pre-bidding") return
            if (room.players[room.currentBidderIndex]?.id !== seat.id) return

            const extra = payload.extra ?? 0
            if (!v.isBidValue(extra) || extra < 0 || room.minBid + extra > room.maxPoints) return

            room.phase = "bidding"
            room.highestBid = room.minBid + extra
            room.highestBidderId = seat.id
            room.numPartners = game.partnersForBid(room.highestBid, room.partnerThresholds)

            if (!settleBiddingIfDecided(room)) advanceBidder(room)
            broadcast(room)
        })

        on("place-bid", payload => {
            const { room, seat } = seatIn(payload)
            if (!seat || room.phase !== "bidding") return
            if (room.players[room.currentBidderIndex]?.id !== seat.id || room.forfeited.includes(seat.id)) return

            const amount = payload.amount
            if (!v.isBidValue(amount) || amount < room.highestBid + game.BID_STEP || amount > room.maxPoints) return

            room.highestBid = amount
            room.highestBidderId = seat.id
            room.numPartners = game.partnersForBid(amount, room.partnerThresholds)

            if (!settleBiddingIfDecided(room)) advanceBidder(room)
            broadcast(room)
        })

        on("forfeit-bid", payload => {
            const { room, seat } = seatIn(payload)
            if (!seat || room.phase !== "bidding" || !room.highestBidderId) return
            if (room.players[room.currentBidderIndex]?.id !== seat.id || room.forfeited.includes(seat.id)) return

            room.forfeited.push(seat.id)
            if (!settleBiddingIfDecided(room)) advanceBidder(room)
            broadcast(room)
        })

        on("confirm-trump", payload => {
            const { room, seat } = seatIn(payload)
            if (!seat || room.phase !== "trump-selection" || room.trumpSelectorId !== seat.id) return

            const { suit, turningCards, priorities } = payload
            if (!Object.hasOwn(game.TRUMP_SUITS, suit)) return

            const needed = room.numPartners
            if (!Array.isArray(turningCards) || turningCards.length !== needed || !turningCards.every(game.isCard)) return

            const usesPriorities = room.numDecks > 1
            if (usesPriorities) {
                if (!Array.isArray(priorities) || priorities.length !== needed) return
                const hand = room.hands[seat.id] ?? []
                const validPriorities = priorities.every((priority, i) =>
                    Number.isInteger(priority)
                    && priority >= 0
                    && priority <= room.numDecks
                    && (priority !== 0 || hand.includes(turningCards[i])))
                if (!validPriorities) return
                const combos = new Set(turningCards.map((card, i) => `${card}:${priorities[i]}`))
                if (combos.size !== needed) return
            } else if (new Set(turningCards).size !== needed) {
                return
            }

            room.trumpSuit = suit
            room.turningCards = turningCards
            room.turningCardPriorities = usesPriorities ? priorities : null
            room.turningCardPlayCounts = {}

            room.phase = "playing"
            room.currentPlayerIndex = room.players.findIndex(p => p.id === seat.id)
            room.currentTrick = []
            room.handNumber = 1
            room.lastTrickWinner = null
            room.trickPending = false
            room.gameOver = false
            for (const player of room.players) {
                room.playerTricks[player.id] = 0
                room.playerPoints[player.id] = 0
                room.playerTeams[player.id] = player.id === room.highestBidderId ? "red" : "blue"
            }

            console.log(`room ${room.id}: ${suit} trump, bid ${room.highestBid}, ${needed} partner(s)`)
            broadcast(room)
        })

        on("play-card", payload => {
            const { room, seat } = seatIn(payload)
            if (!seat || room.phase !== "playing" || room.gameOver || room.trickPending) return
            if (room.players[room.currentPlayerIndex]?.id !== seat.id) return

            const card = payload.card
            const hand = room.hands[seat.id] ?? []
            if (!game.isCard(card) || !game.isLegalPlay(hand, card, leadSuit(room))) return

            hand.splice(hand.indexOf(card), 1)
            revealPartner(room, seat, card)
            room.currentTrick.push({ playerId: seat.id, card })

            if (room.currentTrick.length === room.players.length) {
                completeTrick(room)
            } else {
                room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length
            }
            broadcast(room)
        })

        on("next-hand", payload => {
            const { room, seat } = seatIn(payload)
            if (!seat || !isHost(room, seat) || room.phase !== "playing" || !room.trickPending) return

            room.trickPending = false
            const cardsLeft = Object.values(room.hands).reduce((sum, hand) => sum + hand.length, 0)
            if (cardsLeft === 0) {
                room.gameOver = true
                console.log(`room ${room.id}: game over`)
            } else {
                room.currentTrick = []
            }
            broadcast(room)
        })

        on("restart-game", payload => {
            const { room, seat } = seatIn(payload)
            if (!seat || !isHost(room, seat) || !room.gameOver) return

            resetRound(room)
            room.roundNumber += 1
            // Back in the lobby, so anyone still away gets the normal grace period.
            for (const player of room.players) {
                if (player.offline) startGrace(room, player)
            }
            broadcast(room)
        })

        socket.on("disconnect", () => {
            for (const roomId of socket.data.roomIds) {
                const room = store.get(roomId)
                const seat = room ? seatBySocket(room, socket.id) : null
                if (seat) goOffline(room, seat)
            }
            eventLimiter.forget(socket.id)
            creationLimiter.forget(socket.id)
        })
    }
}

module.exports = { createConnectionHandler }
