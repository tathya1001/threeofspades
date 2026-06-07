const { Server } = require("socket.io")
const { createServer } = require("http")
const httpServer = createServer()
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
})

const { randomUUID } = require("crypto")

let rooms = {}

const MAX_N = { 3: 2, 4: 2, 5: 3, 6: 4, 7: 5, 8: 5, 9: 6, 10: 6 }

function mround(value, multiple) {
    return Math.floor(value / multiple + 0.5) * multiple
}

function getPartnerThresholds(numPlayers, numDecks) {
    const base = mround(250 / numPlayers, 10)
    const maxN = MAX_N[numPlayers] ?? 3
    const result = []
    for (let n = 2; n <= maxN; n++) {
        result.push({
            partners: n - 1,
            threshold: numDecks === 2 ? (base * n + 30) * 2 : base * n + 30,
        })
    }
    return result
}

function getMinBid(numPlayers, numDecks) {
    return getPartnerThresholds(numPlayers, numDecks)[0]?.threshold ?? 90
}

function getNumPartnersForBid(bid, numPlayers, numDecks) {
    const thresholds = getPartnerThresholds(numPlayers, numDecks)
    let partners = 1
    for (const entry of thresholds) {
        if (bid >= entry.threshold) partners = entry.partners
    }
    return partners
}

// ─── Card Utilities ───────────────────────────────────────────────────────────

const CARD_SUITS = ["H", "D", "C", "S"]
const CARD_VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]
// Rank order for trick comparison (higher index = stronger)
const RANK_ORDER = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]

// Trump suit name then suit letter mapping
const TRUMP_SUIT_MAP = { hearts: "H", diamonds: "D", clubs: "C", spades: "S" }

function getCardPoints(card) {
    const rank = card.slice(0, -1)
    const suit = card.slice(-1)
    if (rank === "3" && suit === "S") return 30
    if (["A", "K", "Q", "J", "T"].includes(rank)) return 10
    if (rank === "5") return 5
    return 0
}

function determineTrickWinner(trick, trumpSuitLetter) {
    const leadSuit = trick[0].card.slice(-1)
    let bestIdx = 0
    let bestIsTrump = trick[0].card.slice(-1) === trumpSuitLetter
    let bestRank = RANK_ORDER.indexOf(trick[0].card.slice(0, -1))

    for (let i = 1; i < trick.length; i++) {
        const suit = trick[i].card.slice(-1)
        const rank = RANK_ORDER.indexOf(trick[i].card.slice(0, -1))
        const isTrump = suit === trumpSuitLetter

        if (isTrump && !bestIsTrump) {
            // Trump beats non-trump
            bestIdx = i; bestIsTrump = true; bestRank = rank
        } else if (isTrump && bestIsTrump) {
            // Both trump — higher or equal rank wins (last played wins ties)
            if (rank >= bestRank) { bestIdx = i; bestRank = rank }
        } else if (!isTrump && !bestIsTrump && suit === leadSuit) {
            // Both following lead suit — higher or equal rank wins (last played wins ties)
            if (rank >= bestRank) { bestIdx = i; bestRank = rank }
        }
        // If not trump and not lead suit then cannot win
    }
    return trick[bestIdx]
}

function generateDeck() {
    const deck = []
    for (const suit of CARD_SUITS)
        for (const value of CARD_VALUES)
            deck.push(`${value}${suit}`)
    return deck
}

function shuffleArray(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

// ─── Room Utilities ───────────────────────────────────────────────────────────

function safeRoom(room) {
    room.forfeited = room.forfeited || []
    room.players = room.players || []
    room.playerCards = room.playerCards || {}
    room.cardsDealt = room.cardsDealt || false
    room.turningCards = room.turningCards || []
    room.currentTrick = room.currentTrick || []
    room.playerTricks = room.playerTricks || {}
    room.playerPoints = room.playerPoints || {}
    room.handNumber = room.handNumber || 0
    room.totalHand = room.totalHand || 0
    room.gameOver = room.gameOver || false
    room.trickPending = room.trickPending || false
    room.playerColors = room.playerColors || {}
    room.playerTeams = room.playerTeams || {}
    room.playerDresses = room.playerDresses || {}
    return room
}

function getActiveBidders(room) {
    return room.players.filter(p => !room.forfeited.includes(p.id))
}

function advanceTurn(room) {
    if (getActiveBidders(room).length === 0) return
    let next = (room.currentBidderIndex + 1) % room.players.length
    let guard = 0
    while (room.forfeited.includes(room.players[next].id)) {
        next = (next + 1) % room.players.length
        if (++guard > room.players.length) break
    }
    room.currentBidderIndex = next
}

// ─── Socket Events ────────────────────────────────────────────────────────────

io.on("connection", (socket) => {

    socket.on("create-room", (payload, callback) => {
        const hostName = typeof payload === "string" ? payload : payload?.name ?? ""
        const targetPlayers = payload?.numPlayers || 7
        const numDecks = payload?.numDecks || 1
        const isCustomRule = !!payload?.isCustomRule
        const maxPoints = numDecks === 2 ? 500 : 250

        let minBid, partnerThresholds

        if (isCustomRule && payload.customMinBid && payload.customPartnerThresholds) {
            // Use host-supplied custom rules
            minBid = payload.customMinBid
            // Filter out disabled entries and validate
            partnerThresholds = payload.customPartnerThresholds
                .filter(t => !t.disabled)
                .map(t => ({ partners: t.partners, threshold: t.threshold }))
                .sort((a, b) => a.threshold - b.threshold)
        } else {
            // Standard computed rules
            minBid = getMinBid(targetPlayers, numDecks)
            partnerThresholds = getPartnerThresholds(targetPlayers, numDecks)
        }

        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        const roomId = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * 26)]).join("")

        rooms[roomId] = {
            players: [],
            hostId: socket.id,
            hostName,
            targetPlayers,
            numDecks,
            isCustomRule,
            maxPoints,
            minBid,
            numPartners: 1,
            partnerThresholds,
            counter: 0,
            phase: "waiting",
            highestBid: minBid - 5,
            highestBidderId: null,
            highestBidderName: null,
            currentBidderIndex: 0,
            forfeited: [],
            trumpSuit: null,
            trumpSelectorId: null,
            cardsDealt: false,
            playerCards: {},
            turningCards: [],
            numTurningCards: 1,            // = numPartners, updates live
            totalHand: 0,
            playerColors: {},
            playerTeams: {},
            playerDresses: {},
        }

        console.log(`Room ${roomId} | "${hostName}" | ${targetPlayers}p ${numDecks}d | ${isCustomRule ? "CUSTOM" : "standard"} | minBid:${minBid} | maxPts:${maxPoints} | thresholds:${JSON.stringify(partnerThresholds)}`)
        callback(roomId)
    })

    socket.on("join-room", ({ roomId, name, token }) => {
        const playerName = typeof name === "string" ? name.trim() : ""
        if (!rooms[roomId]) { socket.emit("room-error", "Room not found"); return }
        const room = safeRoom(rooms[roomId])

        let finalName = playerName
        if (!finalName && socket.id === room.hostId) finalName = room.hostName

        const alreadyJoined = room.players.find(p => p.id === socket.id)
        const sameNamePlayer = finalName ? room.players.find(p => p.name === finalName && p.id !== socket.id) : null

        if (sameNamePlayer) {
            // Someone else has claimed this name — verify token
            if (!token || token !== sameNamePlayer.token) {
                // Wrong or missing token: join as spectator (no id swap, no card access)
                socket.join(roomId)
                socket.emit("room-update", { ...room, playerCards: {} })
                return
            }
            // Valid token — hand over the seat to the new socket
            sameNamePlayer.id = socket.id
            sameNamePlayer.token = token
            if (room.hostName === finalName) room.hostId = socket.id
            if (room.trumpSelectorId === sameNamePlayer.id) room.trumpSelectorId = socket.id
            // Move playerCards to new socket id
            if (room.playerCards[sameNamePlayer.id]) {
                room.playerCards[socket.id] = room.playerCards[sameNamePlayer.id]
                delete room.playerCards[sameNamePlayer.id]
            }
            if (room.playerColors[sameNamePlayer.id]) {
                room.playerColors[socket.id] = room.playerColors[sameNamePlayer.id]
                delete room.playerColors[sameNamePlayer.id]
            }
            if (room.playerTeams[sameNamePlayer.id]) {
                room.playerTeams[socket.id] = room.playerTeams[sameNamePlayer.id]
                delete room.playerTeams[sameNamePlayer.id]
            }
            if (room.playerDresses[sameNamePlayer.id]) {
                room.playerDresses[socket.id] = room.playerDresses[sameNamePlayer.id]
                delete room.playerDresses[sameNamePlayer.id]
            }
            socket.join(roomId)
            socket.emit("session-token", token)
            io.to(roomId).emit("room-update", room)
            return
        }

        if (!alreadyJoined && room.players.length >= room.targetPlayers) {
            socket.emit("room-error", "Room is full"); return
        }

        if (!alreadyJoined) {
            const newToken = randomUUID()
            room.players.push({ id: socket.id, name: finalName, token: newToken })
            socket.emit("session-token", newToken)
        } else if (finalName) {
            alreadyJoined.name = finalName
        }

        if (!room.players.find(p => p.id === room.hostId)) {
            if (finalName && finalName === room.hostName) {
                room.hostId = socket.id
            } else if (room.players.length > 0 && !room.hostId) {
                room.hostId = room.players[0].id
                room.hostName = room.players[0].name
            }
        }

        if (!room.playerColors[socket.id]) {
            const colors = [
                "#F14E4E", "#F2B616", "#7ABF0C", "#37C3EE",
                "#F95DCF", "#3C45DD", "#FA7E1A", "#2BD49F",
                "#901BEF", "#BF0043", "#537818", "#545454"
            ]

            const usedColors = Object.values(room.playerColors)
            const availableColors = colors.filter(c => !usedColors.includes(c))
            if (availableColors.length > 0) {
                room.playerColors[socket.id] = availableColors[Math.floor(Math.random() * availableColors.length)]
            }
        }
        if (!room.playerDresses[socket.id]) {
            const dresses = ["ninja", "default", "tie"]
            room.playerDresses[socket.id] = dresses[Math.floor(Math.random() * dresses.length)]
        }

        socket.join(roomId)
        io.to(roomId).emit("room-update", room)
    })

    socket.on("update-dress", ({ roomId, dress }) => {
        const room = rooms[roomId]
        if (!room) return
        safeRoom(room)
        room.playerDresses[socket.id] = dress
        io.to(roomId).emit("room-update", room)
    })

    socket.on("give-cards", (roomId) => {
        const room = rooms[roomId]
        if (!room || room.phase !== "waiting") return
        safeRoom(room)

        const requester = room.players.find(p => p.id === socket.id)
        if (!requester) return
        if (room.hostId !== socket.id && requester.name !== room.hostName) return
        if (room.players.length !== room.targetPlayers) return

        let deck = []
        for (let d = 0; d < room.numDecks; d++) deck = deck.concat(generateDeck())
        deck = shuffleArray(deck)

        const cpp = Math.min(26, Math.floor(deck.length / room.players.length))
        room.playerCards = {}
        room.players.forEach((p, i) => {
            room.playerCards[p.id] = deck.slice(i * cpp, (i + 1) * cpp)
        })
        room.cardsDealt = true
        room.totalHand = cpp
        room.turningCards = []

        console.log(`Cards dealt in ${roomId}: ${cpp}/player`)
        io.to(roomId).emit("room-update", room)
    })

    socket.on("start-bidding", (roomId) => {
        const room = rooms[roomId]
        if (!room) return
        safeRoom(room)

        const requester = room.players.find(p => p.id === socket.id)
        if (!requester) return
        if (room.hostId !== socket.id && requester.name !== room.hostName) return
        if (room.phase !== "waiting") return
        if (room.players.length !== room.targetPlayers) return
        if (!room.cardsDealt) return

        room.phase = "bidding"
        room.highestBid = room.minBid - 5
        room.highestBidderId = null
        room.highestBidderName = null
        room.currentBidderIndex = 0
        room.forfeited = []
        room.turningCards = []
        room.numPartners = 1
        room.numTurningCards = 1

        io.to(roomId).emit("room-update", room)
    })

    socket.on("place-bid", ({ roomId, amount }) => {
        const room = rooms[roomId]
        if (!room || room.phase !== "bidding") return
        safeRoom(room)

        const bidder = room.players[room.currentBidderIndex]
        if (!bidder || bidder.id !== socket.id) return
        if (room.forfeited.includes(socket.id)) return
        if (amount < room.highestBid + 5) return

        room.highestBid = amount
        room.highestBidderId = socket.id
        room.highestBidderName = bidder.name || room.hostName

        // Live update: partners and turning card count follow the bid
        room.numPartners = getNumPartnersForBid(room.highestBid, room.targetPlayers, room.numDecks)
        room.numTurningCards = room.numPartners

        const active = getActiveBidders(room)
        if (active.length === 1) {
            room.phase = "trump-selection"
            room.trumpSelectorId = socket.id
            io.to(roomId).emit("room-update", room)
            return
        }
        advanceTurn(room)
        io.to(roomId).emit("room-update", room)
    })

    socket.on("forfeit-bid", (roomId) => {
        const room = rooms[roomId]
        if (!room || room.phase !== "bidding") return
        safeRoom(room)

        const bidder = room.players[room.currentBidderIndex]
        if (!bidder || bidder.id !== socket.id) return
        if (room.forfeited.includes(socket.id)) return
        if (!room.highestBidderId) return

        room.forfeited.push(socket.id)

        const active = getActiveBidders(room)
        if (active.length === 1) {
            room.phase = "trump-selection"
            room.trumpSelectorId = active[0].id
            io.to(roomId).emit("room-update", room)
            return
        }
        advanceTurn(room)
        io.to(roomId).emit("room-update", room)
    })

    socket.on("confirm-trump", ({ roomId, suit, turningCards, priorities }) => {
        const room = rooms[roomId]
        if (!room || room.phase !== "trump-selection") return
        if (room.trumpSelectorId !== socket.id) return
        if (!["hearts", "diamonds", "clubs", "spades"].includes(suit)) return

        // numTurningCards is locked at the winning bid's partner count
        const needed = room.numTurningCards
        if (!Array.isArray(turningCards) || turningCards.length !== needed) return

        const multiDeck = (room.numDecks || 1) >= 2
        if (multiDeck) {
            // With multiple decks, priorities are required to disambiguate duplicate cards
            if (!Array.isArray(priorities) || priorities.length !== needed) return
            // Validate each priority is between 0 and numDecks (0 is only allowed if selector has the card)
            for (let i = 0; i < needed; i++) {
                const p = priorities[i]
                const c = turningCards[i]
                if (typeof p !== "number" || p < 0 || p > room.numDecks) return
                if (p === 0) {
                    const hand = room.playerCards[socket.id] || []
                    if (!hand.includes(c)) return
                }
            }
            // Uniqueness check: card + priority pairs must be unique
            const combos = turningCards.map((c, i) => `${c}:${priorities[i]}`)
            const uniqueCombos = [...new Set(combos)]
            if (uniqueCombos.length !== needed) return
        } else {
            // Single deck: cards themselves must be unique
            const unique = [...new Set(turningCards)]
            if (unique.length !== needed) return
        }

        room.trumpSuit = suit
        room.turningCards = turningCards
        room.turningCardPriorities = multiDeck ? priorities : undefined
        room.numPartners = getNumPartnersForBid(room.highestBid, room.targetPlayers, room.numDecks)
        room.numTurningCards = room.numPartners
        room.phase = "playing"

        // Initialize playing-phase state
        const selectorIdx = room.players.findIndex(p => p.id === socket.id)
        room.currentPlayerIndex = selectorIdx >= 0 ? selectorIdx : 0
        room.currentTrick = []
        room.trickLeadSuit = null
        room.handNumber = 1
        room.lastTrickWinner = null
        room.gameOver = false
        room.playerTricks = {}
        room.playerPoints = {}
        room.playerTeams = {}
        // Track how many times each turning card has been played (for priority-based partner detection)
        room.turningCardPlayCounts = {}
        for (const tc of turningCards) {
            room.turningCardPlayCounts[tc] = 0
        }
        room.players.forEach(p => {
            room.playerTricks[p.id] = 0;
            room.playerPoints[p.id] = 0;
            room.playerTeams[p.id] = (p.id === room.highestBidderId) ? "red" : "blue"
        })

        console.log(`${roomId} then trump:${suit} turning:[${turningCards}]${multiDeck ? ` priorities:[${priorities}]` : ''} partners:${room.numPartners}`)
        io.to(roomId).emit("room-update", room)
    })

    socket.on("play-card", ({ roomId, card }) => {
        const room = rooms[roomId]
        if (!room || room.phase !== "playing" || room.gameOver) return
        safeRoom(room)

        const currentPlayer = room.players[room.currentPlayerIndex]
        if (!currentPlayer || currentPlayer.id !== socket.id) return

        const hand = room.playerCards[socket.id]
        if (!hand || !hand.includes(card)) return

        // Follow-suit enforcement
        if (room.currentTrick.length > 0) {
            const leadSuit = room.currentTrick[0].card.slice(-1)
            const cardSuit = card.slice(-1)
            if (cardSuit !== leadSuit) {
                const hasLeadSuit = hand.some(c => c.slice(-1) === leadSuit)
                if (hasLeadSuit) return  // Must follow suit
            }
        }

        // Remove card from hand
        room.playerCards[socket.id] = hand.filter((c, i) => i !== hand.indexOf(card))

        // Partner detection: check if this card is a turning card
        // With multi-deck, use priority — only the Nth player to play this card becomes a partner
        if (room.turningCards.includes(card)) {
            const multiDeck = (room.numDecks || 1) >= 2
            if (!room.turningCardPlayCounts) room.turningCardPlayCounts = {}
            // Increment the play count for this card
            room.turningCardPlayCounts[card] = (room.turningCardPlayCounts[card] || 0) + 1
            const playCount = room.turningCardPlayCounts[card]

            if (multiDeck && room.turningCardPriorities) {
                // Check if any turning card entry matches this card AND (current play count matches priority OR priority is 0 and player is not the bidder)
                for (let ti = 0; ti < room.turningCards.length; ti++) {
                    if (room.turningCards[ti] === card) {
                        const pri = room.turningCardPriorities[ti]
                        if (pri === 0) {
                            if (socket.id !== room.highestBidderId) {
                                room.playerTeams[socket.id] = "red"
                                break
                            }
                        } else if (pri === playCount) {
                            room.playerTeams[socket.id] = "red"
                            break
                        }
                    }
                }
            } else {
                // Single deck: first (and only) play of this card then partner
                room.playerTeams[socket.id] = "red"
            }
        }

        // Add to current trick
        room.currentTrick.push({ playerId: socket.id, card })

        // Set lead suit on first card of trick
        if (room.currentTrick.length === 1) {
            room.trickLeadSuit = card.slice(-1)
        }

        // Check if trick is complete
        if (room.currentTrick.length === room.players.length) {
            const trumpLetter = TRUMP_SUIT_MAP[room.trumpSuit] || "S"
            const winner = determineTrickWinner(room.currentTrick, trumpLetter)

            // Tally points
            let trickPoints = 0
            for (const entry of room.currentTrick) {
                trickPoints += getCardPoints(entry.card)
            }
            room.playerPoints[winner.playerId] = (room.playerPoints[winner.playerId] || 0) + trickPoints
            room.playerTricks[winner.playerId] = (room.playerTricks[winner.playerId] || 0) + 1
            room.lastTrickWinner = winner.playerId

            // Winner leads next trick
            const winnerIdx = room.players.findIndex(p => p.id === winner.playerId)
            room.currentPlayerIndex = winnerIdx >= 0 ? winnerIdx : 0

            // Check if game over (either team reached threshold)
            const rebelsThreshold = room.highestBid || 250
            const kingsThreshold = (room.maxPoints || 250) - rebelsThreshold + 5

            const rebelsPts = room.players
                .filter(p => room.playerTeams[p.id] === "red")
                .reduce((sum, p) => sum + (room.playerPoints[p.id] || 0), 0)

            const kingsPts = room.players
                .filter(p => {
                    if (p.id === room.highestBidderId) return false
                    if (room.playerTeams[p.id] === "red") return false
                    const hand = room.playerCards[p.id] || []
                    const hasTurning = hand.some(c => room.turningCards.includes(c))
                    return !hasTurning
                })
                .reduce((sum, p) => sum + (room.playerPoints[p.id] || 0), 0)

            if (rebelsPts >= rebelsThreshold || kingsPts >= kingsThreshold) {
                room.gameOver = true
                room.trickPending = false
                console.log(`${roomId} then GAME OVER (threshold met) | Rebels: ${rebelsPts}/${rebelsThreshold}, Kings: ${kingsPts}/${kingsThreshold}`)
            } else {
                // Pause here — keep cards on table, wait for host to fire next-hand
                room.trickPending = true
                room.handNumber++
                console.log(`${roomId} then trick #${room.handNumber - 1} won by ${winner.playerId} (+${trickPoints}pts) [pending]`)
            }
        } else {
            // Advance to next player clockwise
            room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length
        }

        io.to(roomId).emit("room-update", room)
    })

    socket.on("next-hand", (roomId) => {
        const room = rooms[roomId]
        if (!room || room.phase !== "playing" || !room.trickPending) return
        safeRoom(room)

        // Only host can advance
        const requester = room.players.find(p => p.id === socket.id)
        if (!requester) return
        if (room.hostId !== socket.id && requester.name !== room.hostName) return

        // Check game over (all hands empty)
        const totalCards = Object.values(room.playerCards).reduce((s, h) => s + h.length, 0)
        if (totalCards === 0) {
            room.gameOver = true
            room.trickPending = false
            console.log(`${roomId} then GAME OVER | points: ${JSON.stringify(room.playerPoints)}`)
        } else {
            // Clear the completed trick and resume
            room.currentTrick = []
            room.trickLeadSuit = null
            room.trickPending = false
        }

        io.to(roomId).emit("room-update", room)
    })

    socket.on("disconnect", () => {
        for (const roomId in rooms) {
            const room = rooms[roomId]
            if (!room) continue
            safeRoom(room)

            const wasCurrentBidder = room.players[room.currentBidderIndex]?.id === socket.id
            const wasHost = room.hostId === socket.id

            room.players = room.players.filter(p => p.id !== socket.id)
            room.forfeited = room.forfeited.filter(id => id !== socket.id)
            if (room.playerCards[socket.id]) delete room.playerCards[socket.id]

            if (room.players.length === 0) { delete rooms[roomId]; continue }
            if (wasHost) { room.hostId = room.players[0].id; room.hostName = room.players[0].name }

            if (room.phase === "bidding") {
                const active = getActiveBidders(room)
                if (active.length === 1 && room.highestBidderId) {
                    room.phase = "trump-selection"
                    room.trumpSelectorId = active[0].id
                } else if (wasCurrentBidder && room.players.length > 0) {
                    room.currentBidderIndex = room.currentBidderIndex % room.players.length
                    advanceTurn(room)
                }
            }

            if (room.phase === "trump-selection" && room.trumpSelectorId === socket.id) {
                const active = getActiveBidders(room)
                if (active.length > 0) room.trumpSelectorId = active[0].id
            }

            io.to(roomId).emit("room-update", room)
        }
    })

    socket.on("update-color", ({ roomId, color }) => {
        const room = rooms[roomId]
        if (!room) return
        safeRoom(room)

        const player = room.players.find(p => p.id === socket.id)
        if (!player) return

        const isTaken = Object.entries(room.playerColors).some(([id, c]) => id !== socket.id && c === color)

        if (color && typeof color === "string" && !isTaken) {
            room.playerColors[socket.id] = color
            io.to(roomId).emit("room-update", room)
        }
    })
})

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Socket server running on ${PORT}`))