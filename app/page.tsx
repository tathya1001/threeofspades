"use client"

import { useState, useEffect, useCallback } from "react"
import { socket } from "../lib/socket"
import { useRouter } from "next/navigation"

const MAX_N: Record<number, number> = { 3: 2, 4: 2, 5: 3, 6: 4, 7: 5, 8: 5, 9: 6, 10: 6 }

function mround(value: number, multiple: number) {
    return Math.floor(value / multiple + 0.5) * multiple
}

function getDefaultThresholds(numPlayers: number, numDecks: number) {
    const base = mround(250 / numPlayers, 10)
    const maxN = MAX_N[numPlayers] ?? 3
    const result: { partners: number; threshold: number; disabled: boolean }[] = []
    for (let n = 2; n <= maxN; n++) {
        result.push({
            partners: n - 1,
            threshold: numDecks === 2 ? (base * n + 30) * 2 : base * n + 30,
            disabled: false,
        })
    }
    return result
}

function getDefaultMinBid(numPlayers: number, numDecks: number) {
    const thresholds = getDefaultThresholds(numPlayers, numDecks)
    return thresholds[0]?.threshold ?? 90
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Home() {
    const [screen, setScreen] = useState<"menu" | "host" | "join">("menu")
    const [name, setName] = useState("")
    const [roomId, setRoomId] = useState("")
    const [gameMode, setGameMode] = useState<"standard" | "custom">("standard")

    // Standard mode state
    const [numPlayers, setNumPlayers] = useState(7)
    const [numDecks, setNumDecks] = useState(1)

    // Custom mode state
    const [customPlayers, setCustomPlayers] = useState(7)
    const [customDecks, setCustomDecks] = useState(1)
    const [customMinBid, setCustomMinBid] = useState(110)
    const [customThresholds, setCustomThresholds] = useState<
        { partners: number; threshold: number; disabled: boolean }[]
    >([])

    const router = useRouter()

    const maxPoints = customDecks === 2 ? 500 : 250

    // Regenerate thresholds when custom players or decks change
    const regenerateThresholds = useCallback((players: number, decks: number) => {
        const defaults = getDefaultThresholds(players, decks)
        setCustomThresholds(defaults)
        const defaultMinBid = getDefaultMinBid(players, decks)
        setCustomMinBid(defaultMinBid)
    }, [])

    useEffect(() => {
        if (gameMode === "custom") {
            regenerateThresholds(customPlayers, customDecks)
        }
    }, [customPlayers, customDecks, gameMode, regenerateThresholds])

    // Keep custom thresholds within valid customMinBid and maxPoints bounds
    useEffect(() => {
        setCustomThresholds(prev => {
            let changed = false
            const next = prev.map(t => {
                let val = t.threshold
                if (val < customMinBid) {
                    val = customMinBid
                    changed = true
                }
                if (val > maxPoints) {
                    val = maxPoints
                    changed = true
                }
                if (val !== t.threshold) {
                    return { ...t, threshold: val }
                }
                return t
            })
            return changed ? next : prev
        })
    }, [customMinBid, maxPoints])

    const createRoom = () => {
        if (gameMode === "standard") {
            socket.emit("create-room", { name, numPlayers, numDecks }, (roomId: string) => {
                router.push(`/room/${roomId}`)
            })
        } else {
            socket.emit("create-room", {
                name,
                numPlayers: customPlayers,
                numDecks: customDecks,
                isCustomRule: true,
                customMinBid,
                customPartnerThresholds: customThresholds,
            }, (roomId: string) => {
                router.push(`/room/${roomId}`)
            })
        }
    }

    const joinRoom = () => {
        router.push(`/room/${roomId}?name=${name}`)
    }

    const updateThreshold = (idx: number, threshold: number) => {
        setCustomThresholds(prev => {
            const next = [...prev]
            next[idx] = { ...next[idx], threshold }
            return next
        })
    }

    const toggleDisable = (idx: number) => {
        setCustomThresholds(prev => {
            const next = [...prev]
            const newDisabled = !next[idx].disabled
            // Cascading: if disabling, also disable all higher partner levels
            if (newDisabled) {
                for (let i = idx; i < next.length; i++) {
                    next[i] = { ...next[i], disabled: true }
                }
            } else {
                // Re-enable just this level (and all below it that were disabled by cascade)
                next[idx] = { ...next[idx], disabled: false }
            }
            return next
        })
    }

    // Generate min-bid dropdown options (step of 5, from 50 to maxPoints)
    const minBidOptions: number[] = []
    for (let v = 50; v <= maxPoints; v += 5) minBidOptions.push(v)

    return (
        <div className="min-h-screen bg-[#F3EFE6] text-[#2D2A26] flex items-center justify-center p-6 relative overflow-x-hidden overflow-y-auto">
            <style>{`
                @keyframes bg-scroll {
                    0%   { background-position-x: 0; }
                    100% { background-position-x: -1000px; }
                }
                .custom-select {
                    appearance: none;
                    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238E8980' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
                    background-repeat: no-repeat;
                    background-position: right 1rem center;
                    background-size: 1.2em;
                    background-color: #FDFCFB;
                    border: 1px solid #D8D3C5;
                    border-radius: 12px;
                    padding: 10px 2.5rem 10px 1.25rem;
                    color: #2D2A26;
                    font-family: inherit;
                    font-size: 1.15rem;
                    cursor: pointer;
                    outline: none;
                    width: 100%;
                    transition: all 0.2s ease;
                }
                .custom-select:focus {
                    border-color: #CE670E;
                }
                .custom-select option {
                    background: #F3EFE6;
                    color: #2D2A26;
                }

                input[type="range"] {
                    -webkit-appearance: none;
                    appearance: none;
                    background: transparent;
                    cursor: pointer;
                    width: 100%;
                    outline: none;
                }

                input[type="range"]:disabled {
                    cursor: not-allowed;
                }

                input[type="range"]::-webkit-slider-runnable-track {
                    background: #EBE7DC;
                    height: 6px;
                    border-radius: 3px;
                    border: 1px solid #D8D3C5;
                }

                input[type="range"]:disabled::-webkit-slider-runnable-track {
                    background: #F4F1EA;
                    border-color: #EBE7DC;
                }

                input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    margin-top: -6px;
                    background-color: #CE670E;
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    transition: transform 0.15s ease, background-color 0.15s ease;
                }

                input[type="range"]:disabled::-webkit-slider-thumb {
                    background-color: #8E8980;
                    box-shadow: none;
                }

                input[type="range"]:not(:disabled):hover::-webkit-slider-thumb {
                    transform: scale(1.2);
                    background-color: #0f2e57;
                }

                input[type="range"]::-moz-range-track {
                    background: #EBE7DC;
                    height: 6px;
                    border-radius: 3px;
                    border: 1px solid #D8D3C5;
                }

                input[type="range"]:disabled::-moz-range-track {
                    background: #F4F1EA;
                    border-color: #EBE7DC;
                }

                input[type="range"]::-moz-range-thumb {
                    border: none;
                    background-color: #CE670E;
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    transition: transform 0.15s ease, background-color 0.15s ease;
                }

                input[type="range"]:disabled::-moz-range-thumb {
                    background-color: #8E8980;
                }

                input[type="range"]:not(:disabled):hover::-moz-range-thumb {
                    transform: scale(1.2);
                    background-color: #0f2e57;
                }
            `}</style>

            {/* Background carousel */}
            {/* <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: "url('/bgcards.png')",
                    backgroundRepeat: "repeat-x",
                    backgroundSize: "auto 100%",
                    backgroundPosition: "center",
                    animation: "bg-scroll 90s linear infinite",
                    opacity: 0.8,
                    pointerEvents: "none",
                    zIndex: 0,
                }}
            /> */}

            <div className="w-full max-w-[560px] rounded-[28px] p-8 sm:p-12 flex flex-col items-center relative z-10 transition-all duration-300">

                {/* ═══ SCREEN 1: LANDING/MENU ═══ */}
                {screen === "menu" && (
                    <>
                        <h1 className="text-[3.6rem] text-[#2D2A26] font-bold mb-8 text-center tracking-wide leading-none">
                            KINGS and <br /> REBELS
                        </h1>

                        <div className="w-full max-w-[360px] flex flex-col gap-2.5 mb-8">
                            {/* <label className="text-[1.1rem] text-[#8E8980] uppercase tracking-widest text-center font-bold">
                                Your Name
                            </label> */}
                            <input
                                className="w-full bg-[#F3EFE6] border border-[#D8D3C5] rounded-[12px] px-5 py-3.5 text-center text-[1.5rem] text-[#2D2A26] outline-none focus:border-[#CE670E] focus:ring-1 focus:ring-[#CE670E] transition-all placeholder:text-[#8E8980]/40 font-semibold"
                                placeholder="Enter name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={15}
                            />
                        </div>

                        {/* <div className="text-[1.3rem] text-[#8E8980]/40 tracking-[0.25em] mb-8">
                            • • •
                        </div> */}

                        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-[360px]">
                            <button
                                onClick={() => setScreen("host")}
                                disabled={!name.trim()}
                                className="flex-1 py-4 px-5 rounded-[16px] border border-[#CE670E]/30 text-[#CE670E] bg-[#CE670E]/5 font-bold text-[1.35rem] hover:bg-[#CE670E]/10 hover:border-[#CE670E] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 cursor-pointer flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md"
                            >
                                <span>Host Game</span>
                                {/* <span className="text-[0.85rem] text-[#8E8980] font-normal tracking-wide">Create lobby</span> */}
                            </button>
                            <button
                                onClick={() => setScreen("join")}
                                disabled={!name.trim()}
                                className="flex-1 py-4 px-5 rounded-[16px] border border-[#CE670E]/30 text-[#CE670E] bg-[#CE670E]/5 font-bold text-[1.35rem] hover:bg-[#CE670E]/10 hover:border-[#CE670E] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 cursor-pointer flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md"
                            >
                                <span>Join Game</span>
                                {/* <span className="text-[0.85rem] text-[#8E8980] font-normal tracking-wide">Enter code</span> */}
                            </button>
                        </div>
                    </>
                )}

                {/* ═══ SCREEN 2: JOIN GAME ═══ */}
                {screen === "join" && (
                    <>
                        <button
                            onClick={() => setScreen("menu")}
                            className="self-start flex items-center gap-2 text-[#8E8980] hover:text-[#CE670E] transition-all mb-6 text-[1.2rem] cursor-pointer group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 group-hover:-translate-x-1 transition-transform">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                            </svg>
                            Back
                        </button>

                        <h2 className="text-[2.5rem] text-[#2D2A26] font-bold mb-8 text-center">
                            Join Game
                        </h2>

                        <div className="w-full max-w-[340px] flex flex-col gap-2.5 mb-8">
                            <label className="text-[1.1rem] text-[#8E8980] uppercase tracking-widest text-center font-bold">
                                Room Code
                            </label>
                            <input
                                className="w-full bg-[#F3EFE6] border border-[#D8D3C5] rounded-[12px] px-5 py-3.5 text-center text-[1.7rem] tracking-[0.2em] text-[#2D2A26] outline-none focus:border-[#CE670E] focus:ring-1 focus:ring-[#CE670E] transition-all placeholder:text-[#8E8980]/30 font-bold uppercase"
                                placeholder="LOBBY"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value.toUpperCase().slice(0, 6))}
                                maxLength={6}
                            />
                        </div>

                        <button
                            onClick={joinRoom}
                            disabled={!roomId.trim() || !name.trim()}
                            className="w-full max-w-[340px] border border-[#CE670E] text-white bg-[#CE670E] rounded-[12px] py-4 text-[1.4rem] font-bold hover:bg-[#0f2e57] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 cursor-pointer shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                            <span>Join Game</span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                            </svg>
                        </button>
                    </>
                )}

                {/* ═══ SCREEN 3: HOST GAME ═══ */}
                {screen === "host" && (
                    <>
                        <button
                            onClick={() => setScreen("menu")}
                            className="self-start flex items-center gap-2 text-[#8E8980] hover:text-[#CE670E] transition-all mb-6 text-[1.2rem] cursor-pointer group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 group-hover:-translate-x-1 transition-transform">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                            </svg>
                            Back
                        </button>

                        <h2 className="text-[2.5rem] text-[#2D2A26] font-bold mb-6 text-center">
                            Hosting Settings
                        </h2>

                        <div className="flex gap-0 mb-8 w-full max-w-[340px]">
                            <button
                                onClick={() => setGameMode("standard")}
                                className={`flex-1 py-2.5 text-[1.15rem] font-semibold rounded-l-[12px] border transition-all duration-200 cursor-pointer ${gameMode === "standard"
                                    ? "bg-[#EBE7DC] border-[#BCAE98] text-[#2D2A26]"
                                    : "bg-transparent border-[#E5E0D5] text-[#8E8980] hover:text-[#5C5751]"
                                    }`}
                            >
                                standard
                            </button>
                            <button
                                onClick={() => setGameMode("custom")}
                                className={`flex-1 py-2.5 text-[1.15rem] font-semibold rounded-r-[12px] border border-l-0 transition-all duration-200 cursor-pointer ${gameMode === "custom"
                                    ? "bg-[#CE670E]/8 border-[#CE670E]/40 text-[#CE670E]"
                                    : "bg-transparent border-[#E5E0D5] text-[#8E8980] hover:text-[#5C5751]"
                                    }`}
                            >
                                custom rule
                            </button>
                        </div>

                        {/* ═══ STANDARD MODE ═══ */}
                        {gameMode === "standard" && (
                            <div className="w-full max-w-[360px] flex flex-col gap-6 mb-8">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[1.05rem] text-[#8E8980] uppercase tracking-wider font-bold">
                                        number of players
                                    </label>
                                    <select
                                        value={numPlayers}
                                        onChange={(e) => setNumPlayers(Number(e.target.value))}
                                        className="custom-select"
                                    >
                                        {[4, 5, 6, 7, 8, 9, 10].map(n => (
                                            <option key={n} value={n}>{n} players</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[1.05rem] text-[#8E8980] uppercase tracking-wider font-bold">
                                        number of decks
                                    </label>
                                    <select
                                        value={numDecks}
                                        onChange={(e) => setNumDecks(Number(e.target.value))}
                                        className="custom-select"
                                    >
                                        <option value={1}>1 deck</option>
                                        <option value={2}>2 decks</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* ═══ CUSTOM RULE MODE ═══ */}
                        {gameMode === "custom" && (
                            <div className="w-full flex flex-col gap-6 mb-8 text-[#2D2A26]">

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[1rem] text-[#8E8980] uppercase tracking-wider font-bold">max players</label>
                                        <select
                                            value={customPlayers}
                                            onChange={(e) => setCustomPlayers(Number(e.target.value))}
                                            className="custom-select"
                                        >
                                            {[4, 5, 6, 7, 8, 9, 10].map(n => (
                                                <option key={n} value={n}>{n} players</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-[1rem] text-[#8E8980] uppercase tracking-wider font-bold">decks</label>
                                        <select
                                            value={customDecks}
                                            onChange={(e) => setCustomDecks(Number(e.target.value))}
                                            className="custom-select"
                                        >
                                            <option value={1}>1 deck</option>
                                            <option value={2}>2 decks</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between py-2.5 px-4 rounded-[12px] border border-[#E5E0D5] bg-[#F3EFE6]">
                                    <span className="text-[1.05rem] text-[#8E8980] uppercase tracking-wider font-bold">max points limit</span>
                                    <span className="text-[1.3rem] font-bold text-[#CE670E]">{maxPoints} points</span>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[1rem] text-[#8E8980] uppercase tracking-wider font-bold">minimum bidding points</label>
                                    <select
                                        value={customMinBid}
                                        onChange={(e) => setCustomMinBid(Number(e.target.value))}
                                        className="custom-select"
                                    >
                                        {minBidOptions.map(v => (
                                            <option key={v} value={v}>{v} points</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="w-full h-px bg-[#EBE7DC]" />

                                <div className="flex flex-col gap-3">
                                    <span className="text-[1.05rem] text-[#8E8980] uppercase tracking-wider font-bold text-center">
                                        partner acquisition thresholds
                                    </span>

                                    {customThresholds.map((t, idx) => (
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
                                                    onClick={() => toggleDisable(idx)}
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
                                                    max={maxPoints}
                                                    step={5}
                                                    value={t.threshold}
                                                    onChange={(e) => updateThreshold(idx, Number(e.target.value))}
                                                    disabled={t.disabled}
                                                    className="flex-1"
                                                />
                                                <span className={`text-[1.2rem] font-bold min-w-[75px] text-right ${t.disabled ? "text-[#8E8980]" : "text-[#CE670E]"}`}>
                                                    {t.threshold} pts
                                                </span>
                                            </div>
                                        </div>
                                    ))}

                                    {customThresholds.length === 0 && (
                                        <div className="text-center text-[#8E8980]/50 text-[1rem] py-2">
                                            select max players to configure
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={createRoom}
                            disabled={!name.trim()}
                            className="w-full max-w-[340px] border border-[#CE670E] text-white bg-[#CE670E] rounded-[12px] py-4 text-[1.4rem] font-bold hover:bg-[#0f2e57] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 cursor-pointer shadow-md hover:shadow-lg flex items-center justify-center gap-2 mt-2"
                        >
                            <span>Host Game</span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </button>
                    </>
                )}

            </div>
        </div>
    )
}