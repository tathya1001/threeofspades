import { socket } from "./socket"
import type { Phase, RoomView, Team, TrumpSuit } from "./types"

export const DEFAULT_SEAT_COLOR = "#2D2A26"

export const PHASE_LABELS: Record<Phase | "game-over", string> = {
    "waiting": "lobby",
    "pre-bidding": "opening",
    "bidding": "bidding",
    "trump-selection": "choosing trump",
    "playing": "playing",
    "game-over": "game over",
}

export function phaseKey(room: RoomView): Phase | "game-over" {
    return room.gameOver ? "game-over" : room.phase
}

export function playerName(room: RoomView, id: string | null | undefined) {
    return room.players.find(p => p.id === id)?.name ?? "…"
}

export function seatColor(room: RoomView, id: string | null | undefined) {
    return (id && room.playerColors[id]) || DEFAULT_SEAT_COLOR
}

export function teamSummary(room: RoomView, team: Team) {
    const members = room.players.filter(p => room.playerTeams[p.id] === team)
    return {
        members,
        points: members.reduce((sum, p) => sum + (room.playerPoints[p.id] ?? 0), 0),
        tricks: members.reduce((sum, p) => sum + (room.playerTricks[p.id] ?? 0), 0),
    }
}

/** Points the Kings need to make the bid impossible to reach. */
export function kingsTarget(room: RoomView) {
    return room.maxPoints - room.highestBid + 5
}

/** Everything the player at this table can ask the server to do. */
export function roomActions(roomId: string) {
    return {
        dealCards: () => socket.emit("give-cards", roomId),
        startBidding: () => socket.emit("start-bidding", roomId),
        passOpening: () => socket.emit("pass-prebid", roomId),
        openBid: (extra: number) => socket.emit("open-bid", { roomId, extra }),
        placeBid: (amount: number) => socket.emit("place-bid", { roomId, amount }),
        forfeitBid: () => socket.emit("forfeit-bid", roomId),
        confirmTrump: (suit: TrumpSuit, turningCards: string[], priorities?: number[]) =>
            socket.emit("confirm-trump", { roomId, suit, turningCards, priorities }),
        playCard: (card: string) => socket.emit("play-card", { roomId, card }),
        nextHand: () => socket.emit("next-hand", roomId),
        playAgain: () => socket.emit("restart-game", roomId),
        setColor: (color: string) => socket.emit("update-color", { roomId, color }),
        setDress: (dress: string) => socket.emit("update-dress", { roomId, dress }),
    }
}

export type RoomActions = ReturnType<typeof roomActions>

export function roomPath(roomId: string, name: string) {
    return `/room/${roomId}?name=${encodeURIComponent(name)}`
}

export function inviteUrl(roomId: string) {
    return `${window.location.origin}/?join=${roomId}`
}
