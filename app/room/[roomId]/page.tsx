"use client"
import { useEffect, useState, useRef } from "react"
import { socket } from "../../../lib/socket"
import { useParams, useSearchParams } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Player { id: string; name: string }
interface PartnerThreshold { partners: number; threshold: number }

interface TrickEntry { playerId: string; card: string }

interface RoomState {
    players: Player[]
    hostId: string
    hostName: string
    targetPlayers: number
    numDecks: number
    minBid: number
    numPartners: number
    partnerThresholds: PartnerThreshold[]
    counter: number
    phase: "waiting" | "bidding" | "trump-selection" | "playing"
    highestBid: number
    highestBidderId: string | null
    highestBidderName: string | null
    currentBidderIndex: number
    forfeited: string[]
    trumpSuit: string | null
    trumpSelectorId: string | null
    cardsDealt: boolean
    playerCards: Record<string, string[]>
    turningCards: string[]
    numTurningCards: number
    // Playing phase
    currentPlayerIndex: number
    currentTrick: TrickEntry[]
    trickLeadSuit: string | null
    handNumber: number
    playerTricks: Record<string, number>
    playerPoints: Record<string, number>
    lastTrickWinner: string | null
    gameOver: boolean
    trickPending: boolean
    playerColors: Record<string, string>
    playerTeams: Record<string, string>
    playerDresses: Record<string, string>
}

type SortMode = "suit" | "rank"

// ─── Constants ────────────────────────────────────────────────────────────────

const SUITS = [
    { value: "hearts", label: "Hearts", symbol: "♥", color: "text-[#e05555]", border: "border-[#e05555]" },
    { value: "diamonds", label: "Diamonds", symbol: "♦", color: "text-[#e05555]", border: "border-[#e05555]" },
    { value: "clubs", label: "Clubs", symbol: "♣", color: "text-[#e8e3d8]", border: "border-[#e8e3d8]" },
    { value: "spades", label: "Spades", symbol: "♠", color: "text-[#e8e3d8]", border: "border-[#e8e3d8]" },
]

// Ascending value order: 2 < 3 < … < K < A
const VALUE_ORDER = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]
// Suit display order for "by suit" mode: Spades, Diamonds, Clubs, Hearts
const SUIT_SORT_ORDER = ["S", "D", "C", "H"]

const SUIT_META: Record<string, { symbol: string; color: string }> = {
    H: { symbol: "♥", color: "#e05555" },
    D: { symbol: "♦", color: "#e05555" },
    C: { symbol: "♣", color: "#e8e3d8" },
    S: { symbol: "♠", color: "#e8e3d8" },
}

const SUIT_OPTIONS = [
    { value: "S", label: "♠ Spades" },
    { value: "D", label: "♦ Diamonds" },
    { value: "C", label: "♣ Clubs" },
    { value: "H", label: "♥ Hearts" },
]
const RANK_OPTIONS = [
    { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" },
    { value: "5", label: "5" }, { value: "6", label: "6" }, { value: "7", label: "7" },
    { value: "8", label: "8" }, { value: "9", label: "9" }, { value: "T", label: "10" },
    { value: "J", label: "J" }, { value: "Q", label: "Q" }, { value: "K", label: "K" },
    { value: "A", label: "A" },
]

const AVATAR_COLORS = [
    "#FF4242", "#FFCA3A", "#8AC926", "#6EDDFF",
    "#FF5BD3", "#434DFF", "#FF8019", "#71FCD0",
    "#AE4AFF", "#F31F6A", "#e7ff32", "#ebebeb"
]

const AVATAR_DRESSES = [
    { id: "ninja", label: "Ninja" },
    { id: "default", label: "Default" },
    { id: "tie", label: "Tie" },
]

// SVG path data for inline rendering — extracted from FA icons, viewBox 0 0 640 640
const DRESS_PATHS: Record<string, string> = {
    default: "M320 312C386.3 312 440 258.3 440 192C440 125.7 386.3 72 320 72C253.7 72 200 125.7 200 192C200 258.3 253.7 312 320 312zM290.3 368C191.8 368 112 447.8 112 546.3C112 562.7 125.3 576 141.7 576L498.3 576C514.7 576 528 562.7 528 546.3C528 447.8 448.2 368 349.7 368L290.3 368z",
    ninja: "M448 192C448 262.7 390.7 320 320 320C262.8 320 214.4 282.5 198 230.7C196.9 232 195.8 233.3 194.5 234.5C178.7 250.3 155.7 255.2 140.9 256.6C132.8 257.4 126.3 250.9 127.1 242.8C128.5 228.1 133.4 205 149.2 189.2C155 183.4 161.8 179.1 168.8 175.8C161.8 172.6 155 168.2 149.2 162.4C133.4 146.6 128.5 123.6 127.1 108.8C126.3 100.7 132.8 94.2 140.9 95C155.6 96.4 178.7 101.3 194.5 117.1C199.3 121.9 203.2 127.5 206.2 133.2C227.5 92 270.5 63.8 320 63.8C390.7 63.8 448 121.1 448 191.8zM240 176C240 184.8 247.2 192 256 192L384 192C392.8 192 400 184.8 400 176C400 167.2 392.8 160 384 160L256 160C247.2 160 240 167.2 240 176zM238.6 387L305.6 437.2C314.1 443.6 325.9 443.6 334.4 437.2L401.4 387C407.9 382.1 416.6 380.8 424 384.2C485.4 412.4 528.1 474.4 528.1 546.3C528.1 562.7 514.8 576 498.4 576L141.7 576C125.3 576 112 562.7 112 546.3C112 474.3 154.7 412.3 216.1 384.2C223.5 380.8 232.2 382.1 238.7 387z",
    tie: "M320 312C253.7 312 200 258.3 200 192C200 125.7 253.7 72 320 72C386.3 72 440 125.7 440 192C440 258.3 386.3 312 320 312zM289.5 368L350.5 368C360.2 368 368 375.8 368 385.5C368 389.7 366.5 393.7 363.8 396.9L336.4 428.9L367.4 544L368 544L402.6 405.5C404.8 396.8 413.7 391.5 422.1 394.7C484 418.3 528 478.3 528 548.5C528 563.6 515.7 575.9 500.6 575.9L139.4 576C124.3 576 112 563.7 112 548.6C112 478.4 156 418.4 217.9 394.8C226.3 391.6 235.2 396.9 237.4 405.6L272 544.1L272.6 544.1L303.6 429L276.2 397C273.5 393.8 272 389.8 272 385.6C272 375.9 279.8 368.1 289.5 368.1z",
}

const CARD_W = 72
const CARD_H = 101
// Max 6 turning cards possible, pre-allocate slots
const MAX_TURNING_CARDS = 6
const MAX_HAND_DISPLAY_WIDTH = 640
const MAX_POINTS = 500
const TOTAL_HANDS = 16

const DEFAULT_ROOM: RoomState = {
    players: [],
    hostId: "",
    hostName: "",
    targetPlayers: 7,
    numDecks: 1,
    minBid: 110,
    numPartners: 1,
    partnerThresholds: [],
    counter: 0,
    phase: "waiting",
    highestBid: 105,
    highestBidderId: null,
    highestBidderName: null,
    currentBidderIndex: 0,
    forfeited: [],
    trumpSuit: null,
    trumpSelectorId: null,
    cardsDealt: false,
    playerCards: {},
    turningCards: [],
    numTurningCards: 1,
    currentPlayerIndex: 0,
    currentTrick: [],
    trickLeadSuit: null,
    handNumber: 0,
    playerTricks: {},
    playerPoints: {},
    lastTrickWinner: null,
    gameOver: false,
    trickPending: false,
    playerColors: {},
    playerTeams: {},
    playerDresses: {},
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeRoom(r: Partial<RoomState>): RoomState {
    return {
        ...DEFAULT_ROOM, ...r,
        hostId: typeof r.hostId === "string" ? r.hostId : "",
        hostName: typeof r.hostName === "string" ? r.hostName : "",
        players: r.players ?? [],
        forfeited: r.forfeited ?? [],
        playerCards: r.playerCards ?? {},
        cardsDealt: r.cardsDealt ?? false,
        turningCards: r.turningCards ?? [],
        partnerThresholds: r.partnerThresholds ?? [],
        currentTrick: r.currentTrick ?? [],
        playerTricks: r.playerTricks ?? {},
        playerPoints: r.playerPoints ?? {},
        trickPending: r.trickPending ?? false,
        playerColors: r.playerColors ?? {},
        playerTeams: r.playerTeams ?? {},
        playerDresses: r.playerDresses ?? {},
    }
}

/** Sort by suit group first, then ascending value within suit */
function sortBySuit(cards: string[]): string[] {
    return [...cards].sort((a, b) => {
        const aS = a.slice(-1), bS = b.slice(-1)
        const aV = a.slice(0, -1), bV = b.slice(0, -1)
        const sd = SUIT_SORT_ORDER.indexOf(aS) - SUIT_SORT_ORDER.indexOf(bS)
        return sd !== 0 ? sd : VALUE_ORDER.indexOf(aV) - VALUE_ORDER.indexOf(bV)
    })
}

/** Sort by rank (value) first, then suit within same rank */
function sortByRank(cards: string[]): string[] {
    return [...cards].sort((a, b) => {
        const aS = a.slice(-1), bS = b.slice(-1)
        const aV = a.slice(0, -1), bV = b.slice(0, -1)
        const vd = VALUE_ORDER.indexOf(aV) - VALUE_ORDER.indexOf(bV)
        return vd !== 0 ? vd : SUIT_SORT_ORDER.indexOf(aS) - SUIT_SORT_ORDER.indexOf(bS)
    })
}

function sortCards(cards: string[], mode: SortMode): string[] {
    return mode === "suit" ? sortBySuit(cards) : sortByRank(cards)
}

function parseCard(card: string) {
    const suit = card.slice(-1)
    const rawVal = card.slice(0, -1)
    return { value: rawVal === "T" ? "10" : rawVal, suit, ...SUIT_META[suit] }
}

function getOvalPositions(n: number) {
    if (n === 0) return []
    return Array.from({ length: n }, (_, i) => {
        const angle = Math.PI / 2 + (2 * Math.PI * i) / n
        return { x: 50 + 38 * Math.cos(angle), y: 50 + 35 * Math.sin(angle) }
    })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CardHand({ cards, selectedCard, onSelectCard }: { cards: string[]; selectedCard?: string | null; onSelectCard?: (card: string) => void }) {
    const n = cards.length
    if (n === 0) return null
    const naturalWidth = n * CARD_W + (n - 1) * 4
    const containerWidth = Math.min(naturalWidth, MAX_HAND_DISPLAY_WIDTH)
    const step = n > 1 ? Math.min(CARD_W + 4, (containerWidth - CARD_W) / (n - 1)) : CARD_W

    return (
        <div className="relative mx-auto" style={{ width: `${containerWidth}px`, height: `${CARD_H}px` }}>
            {cards.map((card, i) => {
                const isSelected = selectedCard === card
                return (
                    <div
                        key={`${card}-${i}`}
                        className={`absolute top-0 transition-transform duration-150 cursor-pointer ${isSelected ? "-translate-y-4" : "hover:-translate-y-3"}`}
                        style={{ left: `${i * step}px`, zIndex: isSelected ? 999 : i, width: `${CARD_W}px`, height: `${CARD_H}px` }}
                        onClick={() => onSelectCard?.(card)}
                    >
                        <img
                            src={`/cards/${card}.svg`}
                            alt={card}
                            draggable={false}
                            className="block select-none rounded-md"
                            style={{
                                width: `${CARD_W}px`, height: `${CARD_H}px`,
                                boxShadow: isSelected ? "0 0 20px rgba(198,172,255,0.6), 0 4px 16px rgba(0,0,0,0.7)" : "0 4px 16px rgba(0,0,0,0.7)",
                                outline: isSelected ? "2px solid rgba(198,172,255,0.7)" : "none",
                                borderRadius: "6px",
                            }}
                            onError={(e) => {
                                const t = e.currentTarget as HTMLImageElement
                                t.style.display = "none"
                                const par = t.parentElement
                                if (par && !par.querySelector(".card-fallback")) {
                                    const pc = parseCard(card)
                                    const fb = document.createElement("div")
                                    fb.className = "card-fallback absolute inset-0 rounded-lg flex flex-col items-center justify-center gap-0.5"
                                    fb.style.cssText = "background:#1c1c2e;border:1.5px solid rgba(255,255,255,0.12);box-shadow:0 2px 8px rgba(0,0,0,0.55);"
                                    fb.innerHTML = `<span style="color:${pc.color};font-size:20px;line-height:1">${pc.symbol}</span><span style="color:rgba(255,255,255,0.6);font-size:13px;font-weight:600">${pc.value}</span>`
                                    par.appendChild(fb)
                                }
                            }}
                        />
                    </div>
                )
            })}
        </div>
    )
}

function TurningCardBadge({ card }: { card: string }) {
    const p = parseCard(card)
    return (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/5" style={{ minWidth: "56px" }}>
            <span style={{ color: p.color, fontSize: "15px", lineHeight: 1 }}>{p.symbol}</span>
            <span className="text-[15px] font-bold text-[#e8e3d8]">{p.value}</span>
        </div>
    )
}

function PartnerLadder({ thresholds, currentBid }: { thresholds: PartnerThreshold[]; currentBid: number }) {
    if (!thresholds.length) return null
    return (
        <div className="flex flex-col gap-1.5">
            {thresholds.map(({ partners, threshold }) => {
                const active = currentBid >= threshold
                const higher = thresholds.find(t => t.partners === partners + 1)
                const isCurrent = active && (!higher || currentBid < higher.threshold)
                return (
                    <div
                        key={partners}
                        className={`flex items-center justify-between rounded-lg px-3 py-1.5 border transition-all duration-200 ${isCurrent ? "border-[#c6acff]/50 bg-[#c6acff]/10" :
                            active ? "border-green-500/30 bg-green-500/5" :
                                "border-white/10 opacity-50"
                            }`}
                    >
                        <span className={`text-[13px] ${isCurrent ? "text-[#c6acff]" : active ? "text-green-400/70" : "text-white/35"}`}>
                            {partners} partner{partners !== 1 ? "s" : ""}
                            <span className="ml-1 opacity-60">· {partners} card{partners !== 1 ? "s" : ""}</span>
                        </span>
                        <span className={`text-[15px] font-bold tabular-nums ${isCurrent ? "text-[#c6acff]" : active ? "text-green-400/80" : "text-white/30"}`}>
                            {threshold}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

function AvatarIcon({ dress, color, size = 54 }: { dress?: string; color?: string; size?: number }) {
    const path = DRESS_PATHS[dress || "default"] || DRESS_PATHS.default
    return (
        <svg viewBox="0 0 640 640" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
            <path d={path} fill={color || "#e8e3d8"} />
        </svg>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Room() {
    const params = useParams()
    const search = useSearchParams()
    const roomId = params.roomId as string
    const myName = (search.get("name") ?? "").trim()

    const [room, setRoom] = useState<RoomState>(DEFAULT_ROOM)
    const [myId, setMyId] = useState("")
    const myIdRef = useRef("")
    const [selectedSuit, setSelectedSuit] = useState<string | null>(null)
    const [sortMode, setSortMode] = useState<SortMode>("suit")
    const [selectedCard, setSelectedCard] = useState<string | null>(null)
    const [showTrickPopup, setShowTrickPopup] = useState(false)
    const [isCustomizing, setIsCustomizing] = useState(false)

    // Turning card selections: array of { suit, rank, priority } — pre-allocated to MAX_TURNING_CARDS
    const [turningSelections, setTurningSelections] = useState<{ suit: string; rank: string; priority: string }[]>(
        Array.from({ length: MAX_TURNING_CARDS }, () => ({ suit: "", rank: "", priority: "" }))
    )

    const tokenKey = `tos_token_${roomId}_${myName}`

    useEffect(() => {
        const initId = (id: string) => { myIdRef.current = id; setMyId(id) }
        if (socket.connected && socket.id) initId(socket.id)

        const getToken = () => { try { return localStorage.getItem(tokenKey) ?? undefined } catch { return undefined } }
        const saveToken = (t: string) => { try { localStorage.setItem(tokenKey, t) } catch { /* ignore */ } }

        const onConnect = () => {
            if (socket.id) { initId(socket.id); socket.emit("join-room", { roomId, name: myName, token: getToken() }) }
        }
        const onSessionToken = (t: string) => saveToken(t)
        const onRoomUpdate = (updated: Partial<RoomState>) => {
            if (!myIdRef.current && socket.id) initId(socket.id)
            setRoom(safeRoom(updated))
        }
        socket.on("connect", onConnect)
        socket.on("session-token", onSessionToken)
        socket.on("room-update", onRoomUpdate)
        socket.emit("join-room", { roomId, name: myName, token: getToken() })
        return () => {
            socket.off("connect", onConnect)
            socket.off("session-token", onSessionToken)
            socket.off("room-update", onRoomUpdate)
        }
    }, [roomId, myName, tokenKey])

    // Delay the trick popup by 2 s so the last card is visible first
    useEffect(() => {
        if (!room.trickPending) { setShowTrickPopup(false); return }
        const t = setTimeout(() => setShowTrickPopup(true), 3500)
        return () => clearTimeout(t)
    }, [room.trickPending])

    // ── Derived ────────────────────────────────────────────────────────────
    const effectiveMyId = myId || myIdRef.current || socket.id || ""
    const isHost = (!!effectiveMyId && effectiveMyId === room.hostId) || (!!myName && myName === room.hostName)
    const currentBidder = room.players[room.currentBidderIndex]
    const isMyTurn = room.phase === "bidding" && currentBidder?.id === effectiveMyId
    const iHaveForfeited = room.forfeited.includes(effectiveMyId)
    const isSelector = room.trumpSelectorId === effectiveMyId
    const atLeastOneBid = !!room.highestBidderId
    const canForfeit = isMyTurn && !iHaveForfeited && atLeastOneBid
    const selectorPlayer = room.players.find(p => p.id === room.trumpSelectorId)
    const trumpSuitData = SUITS.find(s => s.value === room.trumpSuit)
    const needsMore = room.targetPlayers - room.players.length

    const rawMyCards = room.playerCards?.[effectiveMyId] ?? []
    const myCards = sortCards(rawMyCards, sortMode)
    const showHand = myCards.length > 0

    // Playing phase derived
    const isMyPlayTurn = room.phase === "playing" && !room.gameOver && !room.trickPending && room.players[room.currentPlayerIndex]?.id === effectiveMyId
    const currentPlayPlayer = room.players[room.currentPlayerIndex]
    const canPlayCard = isMyPlayTurn && !!selectedCard && myCards.includes(selectedCard)

    // numTurningCards comes from server (= numPartners, live)
    const numTC = room.numTurningCards ?? 1
    const tcSlots = turningSelections.slice(0, numTC)
    const needsPriority = (room.numDecks ?? 1) >= 2
    const allTCDone = tcSlots.every(s => s.suit !== "" && s.rank !== "" && (!needsPriority || s.priority !== ""))
    const canConfirm = !!selectedSuit && allTCDone

    const HAND_H = CARD_H + 40     // card height + label + padding
    const CONTROL_W = 160             // right control panel width

    const redMembers = room.players.filter(p => room.playerTeams?.[p.id] === "red")
    const blueMembers = room.players.filter(p => room.playerTeams?.[p.id] === "blue")

    const getTeamPts = (teamId: string) => room.players.filter(p => room.playerTeams?.[p.id] === teamId).reduce((sum, p) => sum + (room.playerPoints?.[p.id] ?? 0), 0)
    const getTeamTrks = (teamId: string) => room.players.filter(p => room.playerTeams?.[p.id] === teamId).reduce((sum, p) => sum + (room.playerTricks?.[p.id] ?? 0), 0)

    // ── Actions ────────────────────────────────────────────────────────────
    const giveCards = () => socket.emit("give-cards", roomId)
    const startBidding = () => socket.emit("start-bidding", roomId)
    const placeBid = (inc: number) => socket.emit("place-bid", { roomId, amount: room.highestBid + inc })
    const forfeitBid = () => socket.emit("forfeit-bid", roomId)

    const playCard = () => {
        if (!canPlayCard || !selectedCard) return
        socket.emit("play-card", { roomId, card: selectedCard })
        setSelectedCard(null)
    }

    const nextHand = () => socket.emit("next-hand", roomId)

    const confirmTrump = () => {
        if (!canConfirm) return
        const cards = tcSlots.map(s => s.rank + s.suit)
        const priorities = needsPriority ? tcSlots.map(s => parseInt(s.priority, 10)) : undefined
        socket.emit("confirm-trump", { roomId, suit: selectedSuit, turningCards: cards, priorities })
        setSelectedSuit(null)
        setTurningSelections(Array.from({ length: MAX_TURNING_CARDS }, () => ({ suit: "", rank: "", priority: "" })))
    }

    const setTurningCard = (idx: number, field: "suit" | "rank" | "priority", value: string) =>
        setTurningSelections(prev => {
            const next = [...prev]
            next[idx] = { ...next[idx], [field]: value }
            return next
        })

    // ── Layout ─────────────────────────────────────────────────────────────
    const myIndex = room.players.findIndex(p => p.id === effectiveMyId)
    const orderedPlayers = myIndex >= 0 ? [...room.players.slice(myIndex), ...room.players.slice(0, myIndex)] : room.players
    const positions = getOvalPositions(orderedPlayers.length)

    // Winner name lookup for trickPending popup
    const trickWinnerName = room.lastTrickWinner
        ? room.players.find(p => p.id === room.lastTrickWinner)?.name ?? "Someone"
        : "Someone"

    return (
        <div className="flex w-screen h-screen bg-[#111] text-[#e8e3d8] overflow-hidden">
            <style>{`
                @keyframes pulse-glow {
                    0%,100%{box-shadow:0 0 0 0 rgba(120,180,255,0.6);}
                    70%{box-shadow:0 0 0 10px rgba(120,180,255,0);}
                }
                .animate-pulse-glow{animation:pulse-glow 1.6s ease-out infinite;}
                @keyframes deal-in{
                    from{opacity:0;transform:translateY(20px);}
                    to{opacity:1;transform:translateY(0);}
                }
                .animate-deal-in{animation:deal-in 0.4s cubic-bezier(.22,1,.36,1) both;}
                .card-select{
                    appearance:none;background:rgba(255,255,255,0.04);
                    border:1px solid rgba(255,255,255,0.18);border-radius:8px;
                    padding:6px 8px;color:#e8e3d8;font-family:inherit;
                    font-size:14px;width:100%;cursor:pointer;outline:none;
                }
                .card-select:focus{border-color:rgba(255,255,255,0.4);}
                .card-select option{background:#1a1a2e;color:#e8e3d8;}
            `}</style>

            {/* ── LEFT PANEL ────────────────────────────────────────────── */}
            <aside className="w-[252px] min-w-[252px] h-full flex flex-col p-5 border-r border-white/10 bg-white/[0.018] z-10 overflow-y-auto">

                <div className="mb-[18px]">
                    <div className="text-[13px] text-[#e8e3d8]/40 tracking-wider mb-0.5">room</div>
                    <div className="text-[22px] font-bold tracking-wide leading-tight">{roomId}</div>
                    <div className={`inline-block mt-1.5 text-[12px] tracking-[0.1em] uppercase rounded px-2 py-0.5 border ${room.phase === "waiting" ? "text-white/40 border-white/15" :
                        room.phase === "bidding" ? "text-blue-400 border-blue-400/30" :
                            room.phase === "trump-selection" ? "text-orange-400 border-orange-400/30" :
                                "text-green-400 border-green-400/30"
                        }`}>{room.phase}</div>
                </div>

                <div className="w-full h-px bg-white/10 mb-3" />

                {isCustomizing ? (
                    <div className="flex flex-col gap-3">
                        <div className="text-[13px] text-[#e8e3d8]/40 mb-1">choose color</div>
                        <div className="grid grid-cols-3 gap-3">
                            {AVATAR_COLORS.map(color => {
                                const isTaken = Object.values(room.playerColors || {}).includes(color) && room.playerColors?.[effectiveMyId] !== color;
                                return (
                                    <button
                                        key={color}
                                        onClick={() => !isTaken && socket.emit("update-color", { roomId, color })}
                                        disabled={isTaken}
                                        className={`relative w-full flex items-center justify-center aspect-square rounded-[14px] border-2 transition-all duration-200 ${room.playerColors?.[effectiveMyId] === color
                                            ? "border-white/90 scale-105 shadow-[0_0_14px_rgba(255,255,255,0.25)] z-10"
                                            : isTaken
                                                ? "border-transparent opacity-30 grayscale-[0.6] cursor-not-allowed"
                                                : "border-transparent opacity-60 hover:opacity-100 hover:scale-105 hover:border-white/30 cursor-pointer"
                                            }`}
                                        style={{ backgroundColor: color }}
                                    >
                                        {isTaken && <span className="text-white/80 font-bold text-2xl drop-shadow-md">×</span>}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="w-full h-px bg-white/10 my-2" />

                        <div className="text-[13px] text-[#e8e3d8]/40 mb-1">choose dress</div>
                        <div className="grid grid-cols-3 gap-3">
                            {AVATAR_DRESSES.map(dress => {
                                const isSelected = (room.playerDresses?.[effectiveMyId] || "default") === dress.id;
                                return (
                                    <button
                                        key={dress.id}
                                        onClick={() => socket.emit("update-dress", { roomId, dress: dress.id })}
                                        className={`relative w-full flex items-center justify-center aspect-square rounded-[14px] border-2 transition-all duration-200 bg-white/5 ${isSelected
                                            ? "border-white/90 scale-105 shadow-[0_0_14px_rgba(255,255,255,0.25)] z-10"
                                            : "border-transparent opacity-60 hover:opacity-100 hover:scale-105 hover:border-white/30 cursor-pointer"
                                            }`}
                                    >
                                        <AvatarIcon dress={dress.id} color={room.playerColors?.[effectiveMyId] || "#e8e3d8"} size={40} />
                                    </button>
                                );
                            })}
                        </div>


                        <div className="w-full h-px bg-white/10 my-2" />
                        <button
                            onClick={() => setIsCustomizing(false)}
                            className="w-full py-2.5 border border-white/20 rounded-lg text-white/80 text-lg font-bold hover:bg-white/10 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <>
                        {/* ══ WAITING ═══════════════════════════════════════════════ */}
                        {room.phase === "waiting" && (
                            <div className="flex flex-col gap-2.5">
                                {isHost && (
                                    <button
                                        onClick={giveCards}
                                        disabled={room.players.length < 2}
                                        className={`w-full py-2.5 rounded-lg text-[1.1rem] font-bold transition-all ${room.cardsDealt
                                            ? "border border-green-500/40 text-green-400/70 bg-green-500/10 cursor-default"
                                            : "border border-[#e05555]/60 text-[#e05555]/80 hover:bg-[#e05555]/10 disabled:opacity-20"
                                            }`}
                                    >
                                        {room.cardsDealt ? "✓ Cards Dealt" : "Give Cards"}
                                    </button>
                                )}
                                {!isHost && room.cardsDealt && (
                                    <div className="text-[13px] text-green-400/70 border border-green-500/20 rounded-lg px-3 py-2 bg-green-500/5 text-center">
                                        ✓ Cards dealt
                                    </div>
                                )}

                                <div className="w-full h-px bg-white/10 my-1" />

                                {([["players", `${room.players.length} / ${room.targetPlayers}`],
                                ["decks", String(room.numDecks)],
                                ["min bid", String(room.minBid)],
                                ] as [string, string][]).map(([label, val]) => (
                                    <div key={label} className="flex justify-between items-center">
                                        <span className="text-[13px] text-[#e8e3d8]/40">{label}</span>
                                        <span className="text-xl font-semibold">{val}</span>
                                    </div>
                                ))}

                                {room.partnerThresholds.length > 0 && (
                                    <>
                                        <div className="w-full h-px bg-white/10 my-1" />
                                        <div className="text-[13px] text-[#e8e3d8]/40 mb-1">partner thresholds</div>
                                        <PartnerLadder thresholds={room.partnerThresholds} currentBid={room.minBid} />
                                    </>
                                )}

                                <div className="mt-2.5">
                                    {isHost ? (
                                        <button
                                            onClick={startBidding}
                                            disabled={needsMore !== 0 || !room.cardsDealt}
                                            className="w-full py-3 border border-white/50 rounded-lg text-white/80 font-bold text-xl hover:bg-white/5 disabled:opacity-20 transition-all"
                                        >
                                            {needsMore > 0 ? `need ${needsMore} more` : !room.cardsDealt ? "deal cards first" : "start bidding"}
                                        </button>
                                    ) : (
                                        <p className="text-white/30 text-base italic leading-relaxed">
                                            waiting for <span className="text-white/50">{room.hostName || "host"}</span> to start...
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ══ BIDDING ════════════════════════════════════════════════ */}
                        {room.phase === "bidding" && (
                            <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    {([["max pts", String(MAX_POINTS)], ["hands", String(TOTAL_HANDS)]] as [string, string][]).map(([l, v]) => (
                                        <div key={l} className="flex flex-col">
                                            <span className="text-[12px] text-[#e8e3d8]/40">{l}</span>
                                            <span className="text-[22px] font-bold leading-tight">{v}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="w-full h-px bg-white/10" />

                                <div>
                                    <div className="text-[13px] text-[#e8e3d8]/40">highest bid</div>
                                    <div className="flex items-baseline gap-2 mt-0.5">
                                        <span className={`font-bold leading-none ${room.highestBidderId ? "text-4xl text-[#c6acff]" : "text-2xl text-white/40"}`}>
                                            {room.highestBidderId ? room.highestBid : `Start: ${room.minBid}`}
                                        </span>
                                        {room.highestBidderName && (
                                            <span className="text-sm text-white/40">by {room.highestBidderName}</span>
                                        )}
                                    </div>
                                </div>

                                {room.partnerThresholds.length > 0 && (
                                    <PartnerLadder
                                        thresholds={room.partnerThresholds}
                                        currentBid={room.highestBidderId ? room.highestBid : room.minBid - 5}
                                    />
                                )}

                                <div className="w-full h-px bg-white/10" />

                                {iHaveForfeited ? (
                                    <p className="text-white/30 text-lg italic">you forfeited.</p>
                                ) : (
                                    <div className="flex flex-col gap-2.5">
                                        <div className="grid grid-cols-2 gap-2">
                                            {[5, 10, 15, 20].map(inc => (
                                                <button
                                                    key={inc}
                                                    onClick={() => placeBid(inc)}
                                                    disabled={!isMyTurn}
                                                    className="py-2.5 border border-white/30 rounded-lg text-[#e8e3d8]/80 text-xl font-semibold hover:bg-white/5 disabled:opacity-10 transition-colors"
                                                >
                                                    +{inc}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={forfeitBid}
                                            disabled={!canForfeit}
                                            className="w-full py-2.5 border border-red-500/50 rounded-lg text-red-500/70 text-xl font-bold hover:bg-red-500/10 disabled:opacity-20 transition-colors"
                                        >
                                            Forfeit
                                        </button>
                                        {!atLeastOneBid && (
                                            <p className="text-[12px] text-white/20">someone must bid before forfeiting</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ══ TRUMP SELECTION ════════════════════════════════════════ */}
                        {room.phase === "trump-selection" && (
                            <div className="flex flex-col gap-3">
                                <div>
                                    <div className="text-[13px] text-[#e8e3d8]/40">bid won</div>
                                    <div className="text-3xl font-bold text-[#c6acff] leading-none">{room.highestBid}</div>
                                    <div className="text-sm text-white/40 mt-0.5">
                                        by {selectorPlayer?.name || "…"} · {room.numPartners} partner{room.numPartners !== 1 ? "s" : ""}
                                    </div>
                                </div>

                                <div className="w-full h-px bg-white/10" />

                                {isSelector ? (
                                    <div className="flex flex-col gap-3.5">
                                        {/* Trump suit */}
                                        <div>
                                            <div className="text-[13px] text-[#e8e3d8]/40 mb-2">choose trump</div>
                                            <div className="flex flex-col gap-1.5">
                                                {SUITS.map(suit => (
                                                    <button
                                                        key={suit.value}
                                                        onClick={() => setSelectedSuit(suit.value)}
                                                        className={`flex items-center gap-3 p-2 rounded-lg border text-lg font-semibold transition-all ${selectedSuit === suit.value ? `bg-white/10 ${suit.border}` : "border-white/20"
                                                            } ${suit.color}`}
                                                    >
                                                        <span className="text-2xl">{suit.symbol}</span>
                                                        <span>{suit.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="w-full h-px bg-white/10" />

                                        {/* Turning cards — count = numTurningCards = numPartners */}
                                        <div>
                                            <div className="text-[13px] text-[#e8e3d8]/40 mb-2">
                                                turning cards
                                                <span className="ml-1.5 text-[#c6acff]/70">×{numTC}</span>
                                            </div>
                                            <div className="flex flex-col gap-2.5">
                                                {Array.from({ length: numTC }, (_, idx) => (
                                                    <div key={idx} className="flex gap-1.5 items-center">
                                                        <span className="text-[12px] text-white/25 w-4 shrink-0">{idx + 1}</span>
                                                        <select
                                                            value={turningSelections[idx]?.suit ?? ""}
                                                            onChange={e => setTurningCard(idx, "suit", e.target.value)}
                                                            className="card-select"
                                                        >
                                                            <option value="">suit</option>
                                                            {SUIT_OPTIONS.map(s => (
                                                                <option key={s.value} value={s.value}>{s.label}</option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            value={turningSelections[idx]?.rank ?? ""}
                                                            onChange={e => setTurningCard(idx, "rank", e.target.value)}
                                                            className="card-select"
                                                        >
                                                            <option value="">rank</option>
                                                            {RANK_OPTIONS.map(r => (
                                                                <option key={r.value} value={r.value}>{r.label}</option>
                                                            ))}
                                                        </select>
                                                        {needsPriority && (
                                                            <select
                                                                value={turningSelections[idx]?.priority ?? ""}
                                                                onChange={e => setTurningCard(idx, "priority", e.target.value)}
                                                                className="card-select"
                                                                style={{ maxWidth: "64px" }}
                                                            >
                                                                <option value="">#</option>
                                                                {Array.from({ length: room.numDecks }, (_, i) => (
                                                                    <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            onClick={confirmTrump}
                                            disabled={!canConfirm}
                                            className="w-full py-2.5 border border-blue-400/40 rounded-lg text-blue-400/70 text-xl font-bold hover:bg-blue-400/10 disabled:opacity-20 transition-colors"
                                        >
                                            Set Cards
                                        </button>

                                        {!selectedSuit
                                            ? <p className="text-[12px] text-white/20 -mt-1">pick a trump suit first</p>
                                            : !allTCDone
                                                ? <p className="text-[12px] text-white/20 -mt-1">fill all {numTC} turning card{numTC > 1 ? "s" : ""}{needsPriority ? " (incl. priority)" : ""}</p>
                                                : null}
                                    </div>
                                ) : (
                                    <p className="text-white/30 text-base italic">
                                        waiting for <span className="text-white/50">{selectorPlayer?.name || "…"}</span> to set cards...
                                    </p>
                                )}
                            </div>
                        )}

                        {/* ══ PLAYING ════════════════════════════════════════════════ */}
                        {room.phase === "playing" && (
                            <div className="flex flex-col gap-3.5">
                                {trumpSuitData && (
                                    <div>
                                        <div className="text-[13px] text-[#e8e3d8]/40 mb-1">trump suit</div>
                                        <div className={`flex items-center gap-2.5 p-3 border rounded-xl bg-white/5 ${trumpSuitData.border}`}>
                                            <span className={`text-4xl leading-none ${trumpSuitData.color}`}>{trumpSuitData.symbol}</span>
                                            <span className={`text-xl font-bold ${trumpSuitData.color}`}>{trumpSuitData.label}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="text-[13px] text-[#e8e3d8]/40">hand</div>
                                        <div className="text-2xl font-bold">{room.handNumber}</div>
                                    </div>
                                    <div>
                                        <div className="text-[13px] text-[#e8e3d8]/40">bid</div>
                                        <div className="text-2xl font-bold text-[#c6acff]">{room.highestBid}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[13px] text-[#e8e3d8]/40">partners</div>
                                        <div className="text-2xl font-bold">{room.numPartners}</div>
                                    </div>
                                </div>

                                {room.turningCards.length > 0 && (
                                    <>
                                        <div className="w-full h-px bg-white/10" />
                                        <div>
                                            <div className="text-[13px] text-[#e8e3d8]/40 mb-2">turning cards</div>
                                            <div className="flex flex-wrap gap-2">
                                                {room.turningCards.map((card, i) => (
                                                    <TurningCardBadge key={`${card}-${i}`} card={card} />
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="w-full h-px bg-white/10" />

                                {/* Scoreboard */}
                                <div>
                                    <div className="flex flex-col gap-4">
                                        {/* Red Team */}
                                        <div>
                                            <div className="flex justify-between items-end mb-1.5">
                                                <div>
                                                    <div className="text-[11px] text-[#e05555] opacity-80 font-bold tracking-wider uppercase">red team</div>
                                                    <div className="text-[20px] font-bold text-[#e05555] mt-0.5">{getTeamPts("red")} <span className="text-[13px] font-normal text-white/40">/ {MAX_POINTS}</span></div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[11px] text-[#e05555] opacity-80 font-bold tracking-wider uppercase">hands</div>
                                                    <div className="text-lg font-bold">{getTeamTrks("red")}</div>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {redMembers.map(p => (
                                                    <div key={p.id} className={`flex items-center justify-center w-[30px] h-[30px] rounded ${room.players[room.currentPlayerIndex]?.id === p.id ? "ring-1 ring-white/70" : ""}`} title={p.name}>
                                                        <AvatarIcon dress={room.playerDresses?.[p.id]} color={room.playerColors?.[p.id] || "#e8e3d8"} size={28} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="w-full h-px bg-white/10" />

                                        {/* Blue Team */}
                                        <div>
                                            <div className="flex justify-between items-end mb-1.5">
                                                <div>
                                                    <div className="text-[11px] text-[#5588e0] opacity-80 font-bold tracking-wider uppercase">blue team</div>
                                                    <div className="text-[20px] font-bold text-[#5588e0] mt-0.5">{getTeamPts("blue")} <span className="text-[13px] font-normal text-white/40">/ {MAX_POINTS}</span></div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[11px] text-[#5588e0] opacity-80 font-bold tracking-wider uppercase">hands</div>
                                                    <div className="text-lg font-bold">{getTeamTrks("blue")}</div>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {blueMembers.map(p => (
                                                    <div key={p.id} className={`flex items-center justify-center w-[30px] h-[30px] rounded ${room.players[room.currentPlayerIndex]?.id === p.id ? "ring-1 ring-white/70" : ""}`} title={p.name}>
                                                        <AvatarIcon dress={room.playerDresses?.[p.id]} color={room.playerColors?.[p.id] || "#e8e3d8"} size={28} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {room.gameOver && (
                                    <div className="border border-green-400/40 bg-green-400/10 rounded-lg px-3 py-2.5 text-center">
                                        <div className="text-green-400 font-bold text-lg">Game Over</div>
                                        <div className="text-[13px] text-white/50 mt-1">All cards played</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Footer avatar */}
                {!isCustomizing && (
                    <div className="mt-auto pt-4 shrink-0">
                        <div className="w-full h-px bg-white/10 mb-4" />
                        <div className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-xl p-3">
                            <div className="flex items-center gap-3">
                                <AvatarIcon dress={room.playerDresses?.[effectiveMyId]} color={room.playerColors?.[effectiveMyId] || "#e8e3d8"} size={40} />
                                <span className="font-semibold text-[15px] truncate max-w-[80px] text-[#c6acff]">
                                    {myName || "You"}
                                </span>
                            </div>
                            <button
                                onClick={() => setIsCustomizing(true)}
                                className="px-3 py-1.5 rounded-lg border border-white/20 text-[12px] font-bold text-white/70 hover:bg-white/10 hover:text-white transition-all"
                            >
                                Customize
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            {/* ── GAME AREA ─────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Table + players */}
                <div className="relative flex-1 overflow-hidden">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[74%] h-[70%] border border-white/5 rounded-[50%] pointer-events-none" />
                    {/* Inner oval for played cards */}
                    {room.phase === "playing" && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[36%] h-[34%] border border-dashed border-white/8 rounded-[50%] pointer-events-none" />
                    )}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/5 text-sm tracking-[0.3em] uppercase pointer-events-none select-none">
                        {roomId}
                    </div>

                    {/* Played cards on inner oval */}
                    {room.phase === "playing" && room.currentTrick.length > 0 && orderedPlayers.map((player, i) => {
                        const entry = room.currentTrick.find(e => e.playerId === player.id)
                        if (!entry) return null
                        const angle = Math.PI / 2 + (2 * Math.PI * i) / orderedPlayers.length
                        const ix = 50 + 16 * Math.cos(angle)
                        const iy = 50 + 16 * Math.sin(angle)
                        const pc = parseCard(entry.card)
                        return (
                            <div
                                key={`trick-${player.id}`}
                                className="absolute flex flex-col items-center transition-all duration-300"
                                style={{ left: `${ix}%`, top: `${iy}%`, transform: "translate(-50%, -50%)" }}
                            >
                                <img
                                    src={`/cards/${entry.card}.svg`}
                                    alt={entry.card}
                                    draggable={false}
                                    className="block select-none rounded"
                                    style={{ width: "52px", height: "73px", boxShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
                                    onError={(e) => {
                                        const t = e.currentTarget as HTMLImageElement
                                        t.style.display = "none"
                                        const par = t.parentElement
                                        if (par && !par.querySelector(".card-fallback")) {
                                            const fb = document.createElement("div")
                                            fb.className = "card-fallback rounded flex flex-col items-center justify-center gap-0.5"
                                            fb.style.cssText = `width:52px;height:73px;background:#1c1c2e;border:1.5px solid rgba(255,255,255,0.12);`
                                            fb.innerHTML = `<span style="color:${pc.color};font-size:16px;line-height:1">${pc.symbol}</span><span style="color:rgba(255,255,255,0.6);font-size:11px;font-weight:600">${pc.value}</span>`
                                            par.appendChild(fb)
                                        }
                                    }}
                                />
                            </div>
                        )
                    })}

                    {orderedPlayers.map((player, i) => {
                        const pos = positions[i]
                        if (!pos) return null
                        const isMe = player.id === effectiveMyId
                        const isCurrentBidder = room.phase === "bidding" && room.players[room.currentBidderIndex]?.id === player.id
                        const isCurrentPlayTurn = room.phase === "playing" && !room.gameOver && room.players[room.currentPlayerIndex]?.id === player.id
                        const hasForfeited = room.forfeited.includes(player.id)
                        const isHighestBidder = player.id === room.highestBidderId
                        const isPlayerHost = player.id === room.hostId || (!!player.name && player.name === room.hostName)
                        const displayName = player.name || (isPlayerHost ? room.hostName : "?")
                        const cardCount = room.playerCards?.[player.id]?.length ?? 0
                        const playerTricks = room.playerTricks?.[player.id] ?? 0
                        const playerPts = room.playerPoints?.[player.id] ?? 0

                        return (
                            <div
                                key={player.id}
                                className={`absolute flex flex-col items-center gap-0.5 min-w-[88px] transition-opacity duration-300 ${hasForfeited ? "opacity-40" : "opacity-100"}`}
                                style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}
                            >
                                <div
                                    className={`shrink-0 transition-all ${(isCurrentBidder || isCurrentPlayTurn) ? "drop-shadow-[0_0_12px_rgba(255,255,255,0.5)] animate-pulse-glow" : "drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"}`}
                                >
                                    <AvatarIcon dress={room.playerDresses?.[player.id]} color={room.playerColors?.[player.id] || "#e8e3d8"} size={54} />
                                </div>

                                <div
                                    className={`text-[16px] text-center whitespace-nowrap tracking-wide drop-shadow-md transition-all ${isMe ? "scale-105" : ""}`}
                                    style={{ color: room.playerColors?.[player.id] || "#e8e3d8" }}
                                >
                                    {displayName}
                                    {isPlayerHost && <span className="text-xs ml-1 opacity-50">(host)</span>}
                                </div>

                                {room.cardsDealt && !isMe && cardCount > 0 && (
                                    <div className="text-[11px] text-white/25">{cardCount} cards</div>
                                )}

                                <div className="min-h-[24px] flex items-center justify-center">
                                    {isCurrentBidder && !hasForfeited ? (
                                        <span className="text-[13px] text-blue-400 border border-blue-400/60 bg-blue-400/20 rounded px-2 py-px font-semibold animate-pulse">bidding...</span>
                                    ) : hasForfeited ? (
                                        <span className="text-[13px] text-white/25 border border-white/25 bg-white/5 rounded px-2 py-px">forfeit</span>
                                    ) : isHighestBidder && room.phase !== "waiting" && room.phase !== "playing" ? (
                                        <span className="text-[13px] text-green-400 border border-green-400/70 bg-green-400/10 rounded px-2 py-px font-bold">{room.highestBid}</span>
                                    ) : room.phase === "playing" ? (
                                        <span className="text-[12px] text-white/35 tabular-nums">
                                            {playerTricks}t · {playerPts}pts
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        )
                    })}

                    {room.players.length === 0 && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/20 text-2xl tracking-wide">
                            waiting for players...
                        </div>
                    )}

                    {/* ── TRICK WINNER POPUP ──────────────────────────── */}
                    {room.phase === "playing" && room.trickPending && showTrickPopup && (
                        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                            <div
                                className="pointer-events-auto flex flex-col items-center gap-4 px-10 py-7 rounded-2xl border border-white/15 relative"
                                style={{
                                    background: "rgba(15,15,25,0.82)",
                                    backdropFilter: "blur(18px)",
                                    WebkitBackdropFilter: "blur(18px)",
                                    boxShadow: "0 8px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)",
                                }}
                            >
                                <button
                                    onClick={() => setShowTrickPopup(false)}
                                    className="absolute top-3 right-4 text-white/40 hover:text-white transition-colors text-xl font-bold cursor-pointer"
                                    aria-label="Close"
                                >
                                    ✕
                                </button>
                                <div className="text-[13px] tracking-[0.2em] uppercase text-white/35">hand won</div>
                                <div
                                    className="text-3xl drop-shadow-[0_0_18px_rgba(255,255,255,0.15)] text-center"
                                    style={{ color: "#ffffff66" }}
                                >
                                    <span className="font-bold" style={{ color: room.playerColors?.[room.lastTrickWinner || ""] || "#ffffff88" }}>{trickWinnerName}</span> won the hand
                                </div>
                                {isHost ? (
                                    <button
                                        onClick={nextHand}
                                        className="mt-1 px-8 py-2.5 rounded-xl border border-green-400/50 text-green-400 text-lg font-bold bg-green-400/10 hover:bg-green-400/20 transition-all active:scale-95"
                                    >
                                        Next Round →
                                    </button>
                                ) : (
                                    <div className="text-[13px] text-white/30 italic">waiting for host to start next round…</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── BOTTOM STRIP: hand + right control panel ────────── */}
                {showHand && (
                    <div
                        className="animate-deal-in flex flex-row border-t border-white/[0.07]"
                        style={{ flexShrink: 0 }}
                    >
                        {/* ── Hand area ── */}
                        <div className="flex-1 flex flex-col items-center justify-centre pb-4 pt-2 bg-[#0d0d0d] overflow-hidden">
                            <div className="text-[11px] text-white/20 tracking-[0.2em] uppercase mb-2">
                                your hand · {myCards.length} cards
                            </div>
                            <CardHand cards={myCards} selectedCard={selectedCard} onSelectCard={(c) => setSelectedCard(prev => prev === c ? null : c)} />
                        </div>

                        {/* ── Right control panel ── */}
                        <div
                            className="flex flex-col justify-between gap-1.5 border-l border-white/10 bg-white/[0.018] px-3 py-3 shrink-0"
                            style={{ width: `${CONTROL_W}px` }}
                        >
                            {/* Sort mode toggle */}
                            <div className="flex flex-col gap-1.5">
                                <div className="text-[11px] text-white/30 tracking-wider uppercase mb-0.5">sort</div>
                                <button
                                    onClick={() => setSortMode("suit")}
                                    className={`w-full py-1.5 rounded-lg border text-[14px] font-semibold transition-all ${sortMode === "suit"
                                        ? "border-[#c6acff]/50 text-[#c6acff] bg-[#c6acff]/8"
                                        : "border-white/15 text-white/40 hover:border-white/30 hover:text-white/60"
                                        }`}
                                >
                                    ♠♦♣♥ by suit
                                </button>
                                <button
                                    onClick={() => setSortMode("rank")}
                                    className={`w-full py-1.5 rounded-lg border text-[14px] font-semibold transition-all ${sortMode === "rank"
                                        ? "border-[#c6acff]/50 text-[#c6acff] bg-[#c6acff]/8"
                                        : "border-white/15 text-white/40 hover:border-white/30 hover:text-white/60"
                                        }`}
                                >
                                    2→A by rank
                                </button>
                            </div>

                            {/* Play Card button */}
                            <button
                                onClick={playCard}
                                disabled={!canPlayCard}
                                className={`w-full py-2 rounded-lg border text-[15px] font-bold transition-all ${canPlayCard
                                    ? "border-green-400/50 text-green-400 bg-green-400/10 hover:bg-green-400/20 cursor-pointer"
                                    : "border-white/20 text-white/30 cursor-not-allowed"
                                    }`}
                            >
                                {room.gameOver ? "Game Over" : isMyPlayTurn ? (selectedCard ? "Play Card" : "Select a Card") : "Waiting..."}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}