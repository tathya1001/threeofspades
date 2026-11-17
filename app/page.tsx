"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { defaultMinBid, defaultPartnerThresholds, MAX_PLAYERS, MIN_CUSTOM_BID, MIN_PLAYERS, maxPoints as maxPointsFor } from "@/shared/game"
import { ScrollingBackdrop } from "@/components/ScrollingBackdrop"
import { useSlowConnection } from "@/components/ConnectionStatus"
import { useClientValue } from "@/lib/hooks"
import { clearNotice, useNotice } from "@/lib/notice"
import { roomPath } from "@/lib/room"
import { socket } from "@/lib/socket"
import { readStorage, storageKeys } from "@/lib/storage"

type Screen = "menu" | "host" | "join"
type GameMode = "standard" | "custom"
type EditableThreshold = { partners: number; threshold: number; disabled: boolean }
type CreateRoomReply = { ok: true; roomId: string } | { ok: false; error: string }

const PLAYER_COUNTS = Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i)
const DEFAULT_PLAYERS = 7
// Generous, because a sleeping server can take most of a minute to wake up.
const CREATE_TIMEOUT_MS = 60_000

const editableThresholds = (players: number, decks: number): EditableThreshold[] =>
    defaultPartnerThresholds(players, decks).map(t => ({ ...t, disabled: false }))

const cleanRoomCode = (value: string) => value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6)

const backButton = "self-start flex items-center gap-2 text-[#8E8980] hover:text-[#CE670E] transition-all mb-6 text-[1.2rem] cursor-pointer group"
const primaryButton = "w-full max-w-[340px] border border-[#CE670E] text-white bg-[#CE670E] rounded-[12px] py-4 text-[1.4rem] font-bold hover:bg-[#0f2e57] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 cursor-pointer shadow-md hover:shadow-lg flex items-center justify-center gap-2"
const menuButton = "flex-1 py-4 px-5 rounded-[16px] border border-[#CE670E]/30 text-[#CE670E] bg-[#CE670E]/5 font-bold text-[1.35rem] hover:bg-[#CE670E]/10 hover:border-[#CE670E] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 cursor-pointer flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md"
const fieldLabel = "text-[1rem] text-[#8E8980] uppercase tracking-wider font-bold"

function BackButton({ onClick }: { onClick: () => void }) {
    return (
        <button onClick={onClick} className={backButton}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 group-hover:-translate-x-1 transition-transform" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back
        </button>
    )
}

export default function Home() {
    const router = useRouter()
    const notice = useNotice()
    const { slow: serverSlow } = useSlowConnection()

    // Remembered values from the last visit, and a room code from an invite link.
    const savedName = useClientValue(() => readStorage(storageKeys.lastName) ?? "", "")
    const savedRoomId = useClientValue(() => readStorage(storageKeys.lastRoom), null)
    const invitedRoomId = useClientValue(() => cleanRoomCode(new URLSearchParams(window.location.search).get("join") ?? ""), "")

    const [screen, setScreen] = useState<Screen>("menu")
    // null means "not edited yet", so the remembered value shows through.
    const [nameDraft, setNameDraft] = useState<string | null>(null)
    const [roomIdDraft, setRoomIdDraft] = useState<string | null>(null)
    const name = nameDraft ?? savedName
    const roomId = roomIdDraft ?? invitedRoomId
    const trimmedName = name.trim()

    const [gameMode, setGameMode] = useState<GameMode>("standard")
    const [numPlayers, setNumPlayers] = useState(DEFAULT_PLAYERS)
    const [numDecks, setNumDecks] = useState(1)

    const [customPlayers, setCustomPlayers] = useState(DEFAULT_PLAYERS)
    const [customDecks, setCustomDecks] = useState(1)
    const [customMinBid, setCustomMinBid] = useState(() => defaultMinBid(DEFAULT_PLAYERS, 1))
    const [customThresholds, setCustomThresholds] = useState(() => editableThresholds(DEFAULT_PLAYERS, 1))

    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)

    const customMaxPoints = maxPointsFor(customDecks)
    const minBidOptions: number[] = []
    for (let v = MIN_CUSTOM_BID; v <= customMaxPoints; v += 5) minBidOptions.push(v)

    const changeCustomTable = (players: number, decks: number) => {
        setCustomPlayers(players)
        setCustomDecks(decks)
        setCustomThresholds(editableThresholds(players, decks))
        setCustomMinBid(defaultMinBid(players, decks))
    }

    // A threshold can never sit below the minimum bid.
    const changeCustomMinBid = (minBid: number) => {
        setCustomMinBid(minBid)
        setCustomThresholds(previous => previous.map(t => (t.threshold < minBid ? { ...t, threshold: minBid } : t)))
    }

    const updateThreshold = (index: number, threshold: number) => {
        setCustomThresholds(previous => previous.map((t, i) => (i === index ? { ...t, threshold } : t)))
    }

    // Disabling a partner level also disables every level above it.
    const toggleThreshold = (index: number) => {
        setCustomThresholds(previous => {
            const disabling = !previous[index].disabled
            return previous.map((t, i) => {
                if (i === index) return { ...t, disabled: disabling }
                if (disabling && i > index) return { ...t, disabled: true }
                return t
            })
        })
    }

    const goTo = (path: string) => {
        clearNotice()
        router.push(path)
    }

    const createRoom = () => {
        setCreating(true)
        setCreateError(null)
        clearNotice()

        const payload = gameMode === "standard"
            ? { name: trimmedName, numPlayers, numDecks }
            : {
                name: trimmedName,
                numPlayers: customPlayers,
                numDecks: customDecks,
                isCustomRule: true,
                customMinBid,
                customPartnerThresholds: customThresholds,
            }

        socket.timeout(CREATE_TIMEOUT_MS).emit("create-room", payload, (err: Error | null, reply?: CreateRoomReply) => {
            setCreating(false)
            if (err || !reply) {
                setCreateError("Couldn't reach the game server. Check your connection and try again.")
            } else if (!reply.ok) {
                setCreateError(reply.error)
            } else {
                goTo(roomPath(reply.roomId, trimmedName))
            }
        })
    }

    const banner = createError ?? notice

    return (
        <div className="min-h-screen bg-[#F3EFE6] text-[#2D2A26] flex items-center justify-center p-6 relative overflow-x-hidden overflow-y-auto">
            <ScrollingBackdrop />

            <Link
                href="/rules"
                className="fixed top-5 right-5 z-20 flex items-center gap-2 px-4 py-2 rounded-full border border-[#D8D3C5] bg-[#F3EFE6]/80 backdrop-blur-sm text-[#5C5751] text-[0.95rem] font-bold hover:border-[#CE670E] hover:text-[#CE670E] hover:bg-[#CE670E]/5 active:scale-95 transition-all shadow-sm"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
                Rules
            </Link>

            <div className="w-full max-w-[560px] rounded-[28px] p-8 sm:p-12 flex flex-col items-center relative z-10 transition-all duration-300">
                {banner && (
                    <div role="alert" className="w-full max-w-[360px] mb-6 flex items-start gap-3 rounded-[12px] border border-red-500/30 bg-red-50 px-4 py-3 text-red-700 text-[1rem] leading-snug">
                        <span className="flex-1">{banner}</span>
                        <button
                            onClick={() => {
                                setCreateError(null)
                                clearNotice()
                            }}
                            aria-label="Dismiss"
                            className="text-red-700/60 hover:text-red-700 cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {screen === "menu" && (
                    <>
                        <Image
                            src="/krlogo.svg"
                            alt="Kings and Rebels"
                            width={460}
                            height={204}
                            preload
                            className="w-full max-w-[360px] h-auto mb-8 select-none"
                        />

                        <div className="w-full max-w-[360px] flex flex-col gap-2.5 mb-8">
                            <input
                                className="w-full bg-[#F3EFE6] border border-[#D8D3C5] rounded-[12px] px-5 py-3.5 text-center text-[1.5rem] text-[#2D2A26] outline-none focus:border-[#CE670E] focus:ring-1 focus:ring-[#CE670E] transition-all placeholder:text-[#8E8980]/40 font-semibold"
                                placeholder="Enter name"
                                aria-label="Your name"
                                value={name}
                                onChange={e => setNameDraft(e.target.value)}
                                onKeyDown={e => {
                                    // Arriving from an invite link, Enter takes you straight to the table.
                                    if (e.key === "Enter" && trimmedName && invitedRoomId) {
                                        e.preventDefault()
                                        goTo(roomPath(invitedRoomId, trimmedName))
                                    }
                                }}
                                maxLength={15}
                                autoComplete="nickname"
                            />
                            {invitedRoomId && (
                                <p className="text-center text-[#8E8980] text-[1rem]">
                                    You&rsquo;ve been invited to room <span className="font-bold tracking-widest text-[#2D2A26]">{invitedRoomId}</span>
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-[360px]">
                            <button onClick={() => setScreen("host")} disabled={!trimmedName} className={menuButton}>
                                <span>Host Game</span>
                            </button>
                            <button onClick={() => setScreen("join")} disabled={!trimmedName} className={menuButton}>
                                <span>Join Game</span>
                            </button>
                        </div>

                        {savedRoomId && trimmedName && !invitedRoomId && (
                            <button
                                onClick={() => goTo(roomPath(savedRoomId, trimmedName))}
                                className="w-full max-w-[360px] flex items-center justify-center gap-2 py-3 px-5 rounded-[16px] border border-dashed border-[#CE670E]/40 text-[#CE670E]/70 text-[1.1rem] font-semibold hover:bg-[#CE670E]/5 hover:border-[#CE670E]/70 hover:text-[#CE670E] active:scale-95 transition-all cursor-pointer mt-4"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                                Rejoin <span className="font-bold tracking-widest">{savedRoomId}</span>
                            </button>
                        )}
                    </>
                )}

                {screen === "join" && (
                    <>
                        <BackButton onClick={() => setScreen("menu")} />

                        <h2 className="text-[2.5rem] text-[#2D2A26] font-bold mb-8 text-center">Join Game</h2>

                        <form
                            className="w-full flex flex-col items-center"
                            onSubmit={e => {
                                e.preventDefault()
                                if (roomId.length === 6 && trimmedName) goTo(roomPath(roomId, trimmedName))
                            }}
                        >
                            <div className="w-full max-w-[340px] flex flex-col gap-2.5 mb-8">
                                <label htmlFor="room-code" className="text-[1.1rem] text-[#8E8980] uppercase tracking-widest text-center font-bold">
                                    Room Code
                                </label>
                                <input
                                    id="room-code"
                                    className="w-full bg-[#F3EFE6] border border-[#D8D3C5] rounded-[12px] px-5 py-3.5 text-center text-[1.7rem] tracking-[0.2em] text-[#2D2A26] outline-none focus:border-[#CE670E] focus:ring-1 focus:ring-[#CE670E] transition-all placeholder:text-[#8E8980]/30 font-bold uppercase"
                                    placeholder="LOBBY"
                                    value={roomId}
                                    onChange={e => setRoomIdDraft(cleanRoomCode(e.target.value))}
                                    maxLength={6}
                                    autoComplete="off"
                                    autoCapitalize="characters"
                                    spellCheck={false}
                                    autoFocus
                                />
                            </div>

                            <button type="submit" disabled={roomId.length !== 6 || !trimmedName} className={primaryButton}>
                                <span>Join Game</span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                </svg>
                            </button>
                        </form>
                    </>
                )}

                {screen === "host" && (
                    <>
                        <BackButton onClick={() => setScreen("menu")} />

                        <h2 className="text-[2.5rem] text-[#2D2A26] font-bold mb-6 text-center">Hosting Settings</h2>

                        <div className="flex gap-0 mb-8 w-full max-w-[340px]" role="group" aria-label="Rule set">
                            <button
                                onClick={() => setGameMode("standard")}
                                aria-pressed={gameMode === "standard"}
                                className={`flex-1 py-2.5 text-[1.15rem] font-semibold rounded-l-[12px] border transition-all duration-200 cursor-pointer ${gameMode === "standard"
                                    ? "bg-[#EBE7DC] border-[#BCAE98] text-[#2D2A26]"
                                    : "bg-transparent border-[#E5E0D5] text-[#8E8980] hover:text-[#5C5751]"
                                    }`}
                            >
                                standard
                            </button>
                            <button
                                onClick={() => setGameMode("custom")}
                                aria-pressed={gameMode === "custom"}
                                className={`flex-1 py-2.5 text-[1.15rem] font-semibold rounded-r-[12px] border border-l-0 transition-all duration-200 cursor-pointer ${gameMode === "custom"
                                    ? "bg-[#CE670E]/8 border-[#CE670E]/40 text-[#CE670E]"
                                    : "bg-transparent border-[#E5E0D5] text-[#8E8980] hover:text-[#5C5751]"
                                    }`}
                            >
                                custom rule
                            </button>
                        </div>

                        {gameMode === "standard" && (
                            <div className="w-full max-w-[360px] flex flex-col gap-6 mb-8">
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="players" className="text-[1.05rem] text-[#8E8980] uppercase tracking-wider font-bold">
                                        number of players
                                    </label>
                                    <select id="players" value={numPlayers} onChange={e => setNumPlayers(Number(e.target.value))} className="custom-select">
                                        {PLAYER_COUNTS.map(n => <option key={n} value={n}>{n} players</option>)}
                                    </select>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label htmlFor="decks" className="text-[1.05rem] text-[#8E8980] uppercase tracking-wider font-bold">
                                        number of decks
                                    </label>
                                    <select id="decks" value={numDecks} onChange={e => setNumDecks(Number(e.target.value))} className="custom-select">
                                        <option value={1}>1 deck</option>
                                        <option value={2}>2 decks</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {gameMode === "custom" && (
                            <div className="w-full flex flex-col gap-6 mb-8 text-[#2D2A26]">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="custom-players" className={fieldLabel}>max players</label>
                                        <select
                                            id="custom-players"
                                            value={customPlayers}
                                            onChange={e => changeCustomTable(Number(e.target.value), customDecks)}
                                            className="custom-select"
                                        >
                                            {PLAYER_COUNTS.map(n => <option key={n} value={n}>{n} players</option>)}
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="custom-decks" className={fieldLabel}>decks</label>
                                        <select
                                            id="custom-decks"
                                            value={customDecks}
                                            onChange={e => changeCustomTable(customPlayers, Number(e.target.value))}
                                            className="custom-select"
                                        >
                                            <option value={1}>1 deck</option>
                                            <option value={2}>2 decks</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between py-2.5 px-4 rounded-[12px] border border-[#E5E0D5] bg-[#F3EFE6]">
                                    <span className="text-[1.05rem] text-[#8E8980] uppercase tracking-wider font-bold">max points limit</span>
                                    <span className="text-[1.3rem] font-bold text-[#CE670E]">{customMaxPoints} points</span>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label htmlFor="custom-min-bid" className={fieldLabel}>minimum bidding points</label>
                                    <select
                                        id="custom-min-bid"
                                        value={customMinBid}
                                        onChange={e => changeCustomMinBid(Number(e.target.value))}
                                        className="custom-select"
                                    >
                                        {minBidOptions.map(v => <option key={v} value={v}>{v} points</option>)}
                                    </select>
                                </div>

                                <div className="w-full h-px bg-[#EBE7DC]" />

                                <div className="flex flex-col gap-3">
                                    <span className="text-[1.05rem] text-[#8E8980] uppercase tracking-wider font-bold text-center">
                                        partner acquisition thresholds
                                    </span>

                                    {customThresholds.map((t, index) => (
                                        <div
                                            key={t.partners}
                                            className={`flex flex-col gap-2.5 p-4 rounded-[16px] border transition-all duration-200 ${t.disabled
                                                ? "border-black/5 bg-[#F3EFE6] opacity-45"
                                                : "border-[#E5E0D5] bg-[#FDFCFB]"
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[1.15rem] font-bold ${t.disabled ? "text-[#8E8980]" : "text-[#2D2A26]"}`}>
                                                    {t.partners} Partner{t.partners > 1 ? "s" : ""}
                                                </span>
                                                <button
                                                    onClick={() => toggleThreshold(index)}
                                                    className={`text-[0.9rem] px-3.5 py-1.5 rounded-[8px] border font-bold transition-all duration-200 cursor-pointer ${t.disabled
                                                        ? "border-[#D8D3C5] text-[#2D2A26] bg-[#EBE7DC] hover:bg-[#E2DDCF]"
                                                        : "border-red-500/20 text-red-600 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500"
                                                        }`}
                                                >
                                                    {t.disabled ? "Enable" : "Disable"}
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-4 mt-1">
                                                <input
                                                    type="range"
                                                    min={customMinBid}
                                                    max={customMaxPoints}
                                                    step={5}
                                                    value={t.threshold}
                                                    onChange={e => updateThreshold(index, Number(e.target.value))}
                                                    disabled={t.disabled}
                                                    aria-label={`Bid needed for ${t.partners} partner${t.partners > 1 ? "s" : ""}`}
                                                    className="threshold-slider flex-1"
                                                />
                                                <span className={`text-[1.2rem] font-bold min-w-[75px] text-right ${t.disabled ? "text-[#8E8980]" : "text-[#CE670E]"}`}>
                                                    {t.threshold} pts
                                                </span>
                                            </div>
                                        </div>
                                    ))}

                                    {customThresholds.every(t => t.disabled) && (
                                        <p className="text-center text-[#8E8980] text-[1rem]">No partners: the winning bidder plays alone.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <button onClick={createRoom} disabled={!trimmedName || creating} className={`${primaryButton} mt-2`}>
                            <span>{creating ? "Creating…" : "Host Game"}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </button>
                    </>
                )}

                {serverSlow && (
                    <p role="status" className="mt-6 max-w-[360px] text-center text-[#8E8980] text-[0.95rem] leading-relaxed">
                        Connecting to the game server… the first visit after a quiet spell can take up to a minute.
                    </p>
                )}
            </div>
        </div>
    )
}
