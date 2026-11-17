// Game rules shared by the server, which enforces them, and the client, which
// uses them for previews and hints. Kept as plain CommonJS so the Node server
// can require it directly without a build step.
"use strict"

// A card is a two-character code: rank then suit, e.g. "QH", "3S", "TC" (ten).
const SUITS = ["C", "D", "H", "S"]
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]

const TRUMP_SUITS = { clubs: "C", diamonds: "D", hearts: "H", spades: "S" }

const MIN_PLAYERS = 4
const MAX_PLAYERS = 10
const DECK_OPTIONS = [1, 2]
const BID_STEP = 5
const POINTS_PER_DECK = 250
// Lowest minimum bid a host can pick when setting custom rules.
const MIN_CUSTOM_BID = 50

// Largest team (bidder plus partners) allowed at each table size.
const MAX_TEAM_SIZE = { 4: 2, 5: 3, 6: 4, 7: 5, 8: 5, 9: 6, 10: 6 }

/** @param {number} numPlayers */
function maxPartners(numPlayers) {
    return (MAX_TEAM_SIZE[numPlayers] ?? 2) - 1
}

/** @param {string} card */
function rankOf(card) {
    return card.slice(0, -1)
}

/** @param {string} card */
function suitOf(card) {
    return card.slice(-1)
}

/** @param {unknown} value */
function isCard(value) {
    return typeof value === "string"
        && value.length === 2
        && RANKS.includes(value[0])
        && SUITS.includes(value[1])
}

/** @param {string} card */
function cardPoints(card) {
    if (card === "3S") return 30
    const rank = rankOf(card)
    if (rank === "5") return 5
    return ["T", "J", "Q", "K", "A"].includes(rank) ? 10 : 0
}

/** @param {number} numDecks */
function maxPoints(numDecks) {
    return POINTS_PER_DECK * numDecks
}

/** @param {number} value @param {number} multiple */
function roundToNearest(value, multiple) {
    return Math.floor(value / multiple + 0.5) * multiple
}

/**
 * Bid needed to unlock each partner count. A team of n players can expect
 * roughly n "fair shares" of the deck, so the threshold is that plus a
 * 30-point margin (the value of the three of spades).
 *
 * @param {number} numPlayers
 * @param {number} numDecks
 * @returns {{ partners: number, threshold: number }[]}
 */
function defaultPartnerThresholds(numPlayers, numDecks) {
    const fairShare = roundToNearest(POINTS_PER_DECK / numPlayers, 10)
    const thresholds = []
    for (let partners = 1; partners <= maxPartners(numPlayers); partners++) {
        const teamSize = partners + 1
        const singleDeck = fairShare * teamSize + 30
        thresholds.push({ partners, threshold: singleDeck * numDecks })
    }
    return thresholds
}

/** @param {number} numPlayers @param {number} numDecks */
function defaultMinBid(numPlayers, numDecks) {
    return defaultPartnerThresholds(numPlayers, numDecks)[0].threshold
}

/**
 * Number of partners the winning bidder gets for a bid. Below the lowest
 * threshold (only possible with custom rules) the bidder plays alone.
 *
 * @param {number} bid
 * @param {{ partners: number, threshold: number }[]} thresholds
 */
function partnersForBid(bid, thresholds) {
    let partners = 0
    for (const level of thresholds) {
        if (bid >= level.threshold && level.partners > partners) partners = level.partners
    }
    return partners
}

/**
 * Cards removed before dealing so every player gets the same number. The
 * lowest zero-point cards go first, which keeps every point card in play and
 * the deck total at exactly 250 per deck.
 *
 * @param {number} numPlayers
 * @param {number} numDecks
 * @returns {string[]}
 */
function setAsideCards(numPlayers, numDecks) {
    const surplus = (52 * numDecks) % numPlayers
    const removed = []
    for (const rank of RANKS) {
        for (const suit of SUITS) {
            const card = rank + suit
            if (cardPoints(card) > 0) continue
            for (let copy = 0; copy < numDecks; copy++) {
                if (removed.length === surplus) return removed
                removed.push(card)
            }
        }
    }
    return removed
}

/**
 * Unshuffled deck for the given number of decks, minus the set-aside cards.
 *
 * @param {number} numDecks
 * @param {string[]} [setAside]
 */
function buildDeck(numDecks, setAside = []) {
    const deck = []
    for (let d = 0; d < numDecks; d++) {
        for (const suit of SUITS) {
            for (const rank of RANKS) deck.push(rank + suit)
        }
    }
    for (const card of setAside) {
        const index = deck.indexOf(card)
        if (index !== -1) deck.splice(index, 1)
    }
    return deck
}

/**
 * Players must follow the lead suit when they can; otherwise anything goes.
 *
 * @param {string[]} hand
 * @param {string} card
 * @param {string | null} leadSuit
 */
function isLegalPlay(hand, card, leadSuit) {
    if (!hand.includes(card)) return false
    if (!leadSuit || suitOf(card) === leadSuit) return true
    return !hand.some(c => suitOf(c) === leadSuit)
}

/**
 * Highest trump wins; failing that, the highest card of the lead suit. With
 * two decks the same card can be played twice, and the later copy takes it.
 *
 * @template {{ card: string }} T
 * @param {T[]} trick
 * @param {string | null} trumpSuit single-letter suit code
 * @returns {T}
 */
function trickWinner(trick, trumpSuit) {
    const leadSuit = suitOf(trick[0].card)
    let best = trick[0]

    for (const entry of trick.slice(1)) {
        const suit = suitOf(entry.card)
        const bestSuit = suitOf(best.card)
        const higherOrEqual = RANKS.indexOf(rankOf(entry.card)) >= RANKS.indexOf(rankOf(best.card))

        if (suit === trumpSuit) {
            if (bestSuit !== trumpSuit || higherOrEqual) best = entry
        } else if (suit === leadSuit && bestSuit === leadSuit && higherOrEqual) {
            best = entry
        }
    }
    return best
}

module.exports = {
    SUITS,
    RANKS,
    TRUMP_SUITS,
    MIN_PLAYERS,
    MAX_PLAYERS,
    DECK_OPTIONS,
    BID_STEP,
    POINTS_PER_DECK,
    MIN_CUSTOM_BID,
    maxPartners,
    rankOf,
    suitOf,
    isCard,
    cardPoints,
    maxPoints,
    defaultPartnerThresholds,
    defaultMinBid,
    partnersForBid,
    setAsideCards,
    buildDeck,
    isLegalPlay,
    trickWinner,
}
