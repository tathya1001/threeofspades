"use strict"

// Everything arriving over the socket is untrusted. These helpers turn raw
// payloads into known-good values or reject them with a message that is safe
// to show the player.

const game = require("../shared/game")

const NAME_MAX_LENGTH = 15
const ROOM_CODE = /^[A-Z]{6}$/
// Tokens are UUIDs; anything much longer is not one of ours.
const TOKEN_MAX_LENGTH = 64

const isPlainObject = value => typeof value === "object" && value !== null && !Array.isArray(value)

const isWholeNumber = value => Number.isInteger(value)

const isBidValue = value => isWholeNumber(value) && value % game.BID_STEP === 0

function isRoomCode(value) {
    return typeof value === "string" && ROOM_CODE.test(value)
}

/** Room-scoped events send either the bare room code or `{ roomId, ... }`. */
function roomIdFrom(payload) {
    if (isRoomCode(payload)) return payload
    if (isPlainObject(payload) && isRoomCode(payload.roomId)) return payload.roomId
    return null
}

function cleanName(value) {
    if (typeof value !== "string") return null
    // Control and invisible formatting characters (zero-width spaces, bidi
    // overrides) let two names look identical, so they are stripped.
    const name = value
        .replace(/[\p{Cc}\p{Cf}]/gu, "")
        .replace(/\s+/g, " ")
        .trim()
    const length = [...name].length
    return length >= 1 && length <= NAME_MAX_LENGTH ? name : null
}

function cleanToken(value) {
    return typeof value === "string" && value.length > 0 && value.length <= TOKEN_MAX_LENGTH ? value : null
}

function parseJoin(payload) {
    if (!isPlainObject(payload)) return { ok: false, error: "Invalid request." }
    const roomId = isRoomCode(payload.roomId) ? payload.roomId : null
    if (!roomId) return { ok: false, error: "That room code doesn't look right." }
    const name = cleanName(payload.name)
    if (!name) return { ok: false, error: `Pick a name between 1 and ${NAME_MAX_LENGTH} characters.` }
    return { ok: true, value: { roomId, name, token: cleanToken(payload.token) } }
}

function parseCustomThresholds(raw, { numPlayers, minBid, maxPoints }) {
    if (!Array.isArray(raw) || raw.length > game.maxPartners(numPlayers)) return null

    const thresholds = []
    const seen = new Set()
    for (const entry of raw) {
        if (!isPlainObject(entry)) return null
        if (entry.disabled === true) continue

        const { partners, threshold } = entry
        const validPartners = isWholeNumber(partners) && partners >= 1 && partners <= game.maxPartners(numPlayers)
        const validThreshold = isBidValue(threshold) && threshold >= minBid && threshold <= maxPoints
        if (!validPartners || !validThreshold || seen.has(partners)) return null

        seen.add(partners)
        thresholds.push({ partners, threshold })
    }
    return thresholds.sort((a, b) => a.partners - b.partners)
}

function parseRoomSettings(payload) {
    if (!isPlainObject(payload)) return { ok: false, error: "Invalid request." }

    const creatorName = cleanName(payload.name)
    if (!creatorName) return { ok: false, error: `Pick a name between 1 and ${NAME_MAX_LENGTH} characters.` }

    const numPlayers = payload.numPlayers
    if (!isWholeNumber(numPlayers) || numPlayers < game.MIN_PLAYERS || numPlayers > game.MAX_PLAYERS) {
        return { ok: false, error: `Tables seat ${game.MIN_PLAYERS} to ${game.MAX_PLAYERS} players.` }
    }

    const numDecks = payload.numDecks
    if (!game.DECK_OPTIONS.includes(numDecks)) return { ok: false, error: "Play with one or two decks." }

    const maxPoints = game.maxPoints(numDecks)
    const base = { creatorName, numPlayers, numDecks, maxPoints }

    if (payload.isCustomRule !== true) {
        return {
            ok: true,
            value: {
                ...base,
                isCustomRule: false,
                minBid: game.defaultMinBid(numPlayers, numDecks),
                partnerThresholds: game.defaultPartnerThresholds(numPlayers, numDecks),
            },
        }
    }

    const minBid = payload.customMinBid
    if (!isBidValue(minBid) || minBid < game.MIN_CUSTOM_BID || minBid > maxPoints) {
        return { ok: false, error: "The minimum bid is out of range." }
    }

    const partnerThresholds = parseCustomThresholds(payload.customPartnerThresholds, { numPlayers, minBid, maxPoints })
    if (!partnerThresholds) return { ok: false, error: "The partner thresholds are not valid." }

    return { ok: true, value: { ...base, isCustomRule: true, minBid, partnerThresholds } }
}

module.exports = {
    NAME_MAX_LENGTH,
    isPlainObject,
    isWholeNumber,
    isBidValue,
    isRoomCode,
    roomIdFrom,
    cleanName,
    parseJoin,
    parseRoomSettings,
}
