// Shape of the per-player room view the server sends with every "room-update".
// See roomView() in server/rooms.js.

export type Phase = "waiting" | "pre-bidding" | "bidding" | "trump-selection" | "playing"
export type Team = "red" | "blue"
export type TrumpSuit = "hearts" | "diamonds" | "clubs" | "spades"
export type AvatarStyle = "default" | "ninja" | "tie"

export interface Player {
    id: string
    name: string
    offline: boolean
}

export interface PartnerThreshold {
    partners: number
    threshold: number
}

export interface TrickEntry {
    playerId: string
    card: string
}

export interface RoomView {
    id: string
    selfId: string
    phase: Phase
    hostId: string | null

    targetPlayers: number
    numDecks: number
    isCustomRule: boolean
    maxPoints: number
    minBid: number
    partnerThresholds: PartnerThreshold[]

    players: Player[]
    playerColors: Record<string, string>
    playerDresses: Record<string, AvatarStyle>

    cardsDealt: boolean
    cardsPerPlayer: number
    hand: string[]
    cardCounts: Record<string, number>

    highestBid: number
    highestBidderId: string | null
    currentBidderIndex: number
    forfeited: string[]
    numPartners: number

    trumpSuit: TrumpSuit | null
    trumpSelectorId: string | null
    turningCards: string[]
    turningCardPriorities: number[] | null

    currentPlayerIndex: number
    currentTrick: TrickEntry[]
    handNumber: number
    playerTricks: Record<string, number>
    playerPoints: Record<string, number>
    playerTeams: Record<string, Team>
    lastTrickWinner: string | null
    trickPending: boolean
    gameOver: boolean
}
