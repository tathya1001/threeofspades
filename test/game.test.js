"use strict"

const { test } = require("node:test")
const assert = require("node:assert/strict")
const game = require("../shared/game")

const sumPoints = cards => cards.reduce((total, card) => total + game.cardPoints(card), 0)

test("a single deck is worth 250 points", () => {
    assert.equal(sumPoints(game.buildDeck(1)), 250)
    assert.equal(sumPoints(game.buildDeck(2)), 500)
})

test("set-aside cards make the deal even without removing any points", () => {
    for (const numDecks of game.DECK_OPTIONS) {
        for (let players = game.MIN_PLAYERS; players <= game.MAX_PLAYERS; players++) {
            const setAside = game.setAsideCards(players, numDecks)
            const deck = game.buildDeck(numDecks, setAside)

            assert.equal(deck.length % players, 0, `${players}p/${numDecks}d should deal evenly`)
            assert.equal(sumPoints(setAside), 0)
            assert.equal(sumPoints(deck), game.maxPoints(numDecks))
        }
    }
})

test("the lowest cards are set aside first", () => {
    assert.deepEqual(game.setAsideCards(7, 1), ["2C", "2D", "2H"])
    assert.deepEqual(game.setAsideCards(9, 1), ["2C", "2D", "2H", "2S", "3C", "3D", "3H"])
    assert.deepEqual(game.setAsideCards(4, 1), [])
})

test("default thresholds match the published table for 7 players", () => {
    assert.deepEqual(game.defaultPartnerThresholds(7, 1), [
        { partners: 1, threshold: 110 },
        { partners: 2, threshold: 150 },
        { partners: 3, threshold: 190 },
        { partners: 4, threshold: 230 },
    ])
    assert.equal(game.defaultMinBid(7, 1), 110)
    assert.equal(game.defaultMinBid(7, 2), 220)
})

test("partner count follows the highest threshold reached", () => {
    const thresholds = game.defaultPartnerThresholds(7, 1)
    assert.equal(game.partnersForBid(110, thresholds), 1)
    assert.equal(game.partnersForBid(149, thresholds), 1)
    assert.equal(game.partnersForBid(150, thresholds), 2)
    assert.equal(game.partnersForBid(250, thresholds), 4)
})

test("a bid below every custom threshold plays solo", () => {
    assert.equal(game.partnersForBid(100, [{ partners: 1, threshold: 120 }]), 0)
    assert.equal(game.partnersForBid(200, []), 0)
})

test("card points", () => {
    assert.equal(game.cardPoints("3S"), 30)
    assert.equal(game.cardPoints("3H"), 0)
    assert.equal(game.cardPoints("AH"), 10)
    assert.equal(game.cardPoints("TC"), 10)
    assert.equal(game.cardPoints("5D"), 5)
    assert.equal(game.cardPoints("9S"), 0)
})

test("isCard rejects anything that is not a real card code", () => {
    assert.ok(game.isCard("TS"))
    for (const bad of ["10S", "1S", "AX", "", "__proto__", null, 42, ["AS"]]) {
        assert.equal(game.isCard(bad), false, String(bad))
    }
})

test("players must follow suit when they can", () => {
    const hand = ["2H", "KH", "AS"]
    assert.ok(game.isLegalPlay(hand, "KH", "H"))
    assert.equal(game.isLegalPlay(hand, "AS", "H"), false)
    assert.ok(game.isLegalPlay(hand, "AS", "D"), "void in diamonds, anything goes")
    assert.ok(game.isLegalPlay(hand, "AS", null), "leading is unrestricted")
    assert.equal(game.isLegalPlay(hand, "QC", null), false, "card must be in hand")
})

test("highest card of the lead suit wins without trumps", () => {
    const trick = [
        { playerId: "a", card: "9H" },
        { playerId: "b", card: "KH" },
        { playerId: "c", card: "AS" },
    ]
    assert.equal(game.trickWinner(trick, "D").playerId, "b")
})

test("any trump beats the lead suit, highest trump wins", () => {
    const trick = [
        { playerId: "a", card: "AH" },
        { playerId: "b", card: "2S" },
        { playerId: "c", card: "9S" },
        { playerId: "d", card: "KH" },
    ]
    assert.equal(game.trickWinner(trick, "S").playerId, "c")
})

test("with two decks the later copy of an identical card wins", () => {
    const trick = [
        { playerId: "a", card: "AH" },
        { playerId: "b", card: "AH" },
    ]
    assert.equal(game.trickWinner(trick, "S").playerId, "b")
})
