"use client"

import { useRouter } from "next/navigation"

// ─── Reusable mini card component ───────────────────────────────────────────
function Card({ code, size = "md" }: { code: string; size?: "sm" | "md" | "lg" }) {
    const dims: Record<string, string> = {
        sm: "w-9 h-[52px]",
        md: "w-12 h-[68px]",
        lg: "w-16 h-[90px]",
    }
    return (
        <img
            src={`/cards/${code}.svg`}
            alt={code}
            className={`${dims[size]} rounded-[4px] shadow-sm select-none inline-block`}
            draggable={false}
        />
    )
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({
    id,
    title,
    children,
}: {
    id: string
    title: string
    children: React.ReactNode
}) {
    return (
        <section id={id} className="w-full max-w-[720px] mx-auto mb-12">
            <div className="flex items-center gap-3 mb-5">
                <h2 className="text-[1.6rem] font-bold text-[#2D2A26] tracking-wide leading-none">
                    {title}
                </h2>
                <div className="flex-1 h-px bg-[#D8D3C5] ml-2" />
            </div>
            <div className="flex flex-col gap-4 text-[1.1rem] text-[#2D2A26] leading-relaxed">
                {children}
            </div>
        </section>
    )
}

// ─── Pill badge ──────────────────────────────────────────────────────────────
function Pill({ children, color = "orange" }: { children: React.ReactNode; color?: "orange" | "navy" | "green" | "red" }) {
    const colors: Record<string, string> = {
        orange: "bg-[#CE670E]/10 text-[#CE670E] border-[#CE670E]/25",
        navy: "bg-[#0f2e57]/10 text-[#0f2e57] border-[#0f2e57]/25",
        green: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
        red: "bg-red-500/10 text-red-700 border-red-500/25",
    }
    return (
        <span className={`inline-flex items-center px-3 py-0.5 rounded-full border text-[0.9rem] font-bold ${colors[color]}`}>
            {children}
        </span>
    )
}

// ─── Info card ───────────────────────────────────────────────────────────────
function InfoCard({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
    return (
        <div className={`rounded-[16px] border p-5 ${accent
            ? "bg-[#CE670E]/5 border-[#CE670E]/20"
            : "bg-[#FDFCFB] border-[#E5E0D5]"
            }`}>
            {children}
        </div>
    )
}

// ─── Phase step ─────────────────────────────────────────────────────────────
function PhaseStep({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
    return (
        <div className="flex gap-4">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#CE670E] text-white flex items-center justify-center font-bold text-[1rem]">
                {num}
            </div>
            <div className="flex-1 pt-1">
                <div className="font-bold text-[1.1rem] text-[#2D2A26] mb-1">{title}</div>
                <div className="text-[#5C5751] text-[1rem] leading-relaxed">{children}</div>
            </div>
        </div>
    )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function RulesPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-[#F3EFE6] text-[#2D2A26] relative overflow-x-hidden">
            <style>{`
                @keyframes bg-scroll {
                    0%   { background-position-x: 0; }
                    100% { background-position-x: -1000px; }
                }
            `}</style>

            {/* Same scrolling background as home */}
            <div
                style={{
                    position: "fixed",
                    inset: 0,
                    backgroundImage: "url('/homebg.svg')",
                    backgroundRepeat: "repeat-x",
                    backgroundSize: "auto 100%",
                    backgroundPosition: "center",
                    animation: "bg-scroll 90s linear infinite",
                    opacity: 0.025,
                    pointerEvents: "none",
                    zIndex: 0,
                }}
            />

            {/* Header */}
            <header className="sticky top-0 z-20 bg-[#F3EFE6]/90 backdrop-blur-sm border-b border-[#E5E0D5]">
                <div className="max-w-[720px] mx-auto px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-[#8E8980] hover:text-[#CE670E] transition-all text-[1rem] cursor-pointer group"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 group-hover:-translate-x-1 transition-transform">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                        </svg>
                        Back
                    </button>
                    <h1 className="text-[1.4rem] font-bold text-[#2D2A26] tracking-wide">
                        How to Play
                    </h1>
                    <div className="w-16" /> {/* spacer */}
                </div>
            </header>

            {/* Hero */}
            <div className="relative z-10 max-w-[720px] mx-auto px-6 pt-10 pb-8 text-center">
                <div className="flex justify-center gap-2 mb-5">
                    <Card code="KS" size="lg" />
                    <Card code="3S" size="lg" />
                    <Card code="AS" size="lg" />
                    <Card code="KH" size="lg" />
                    <Card code="AH" size="lg" />
                </div>
                <h2 className="text-[2.2rem] font-bold text-[#2D2A26] tracking-wide mb-2">
                    Kings and Rebels
                </h2>
                <p className="text-[#8E8980] text-[1.05rem] max-w-[480px] mx-auto leading-relaxed">
                    A real-time multiplayer trick-taking card game of hidden alliances, bold bids, and secret partners.
                </p>
            </div>

            {/* Quick nav */}
            <nav className="relative z-10 max-w-[720px] mx-auto px-6 mb-10">
                <div className="flex flex-wrap gap-2 justify-center">
                    {[
                        ["#teams", "Teams"],
                        ["#card-points", "Card Points"],
                        ["#bidding", "Bidding"],
                        ["#trump", "Trump & Partners"],
                        ["#playing", "Playing Tricks"],
                        ["#scoring", "Scoring"],
                    ].map(([href, label]) => (
                        <a
                            key={href}
                            href={href}
                            className="px-4 py-1.5 rounded-full border border-[#D8D3C5] text-[0.9rem] text-[#5C5751] font-bold hover:border-[#CE670E] hover:text-[#CE670E] transition-all"
                        >
                            {label}
                        </a>
                    ))}
                </div>
            </nav>

            {/* Content */}
            <main className="relative z-10 px-6 pb-24">

                {/* ── TEAMS ── */}
                <Section id="teams" title="The Two Teams">
                    <InfoCard accent>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold text-[1.15rem] text-[#0f2e57]">Blue Team — Kings</span>
                                </div>
                                <p className="text-[#5C5751] text-[0.95rem]">
                                    Everyone else starts as a <strong>King</strong> (the established rulers). They don't know which of their fellow Kings is secretly a rebel imposter. They must collectively prevent the Rebel Leader from hitting their bid.
                                </p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold text-[1.15rem] text-red-700">Red Team — Rebels</span>
                                </div>
                                <p className="text-[#5C5751] text-[0.95rem]">
                                    The winning bidder is the <strong>Rebel Leader</strong>. Before play begins, they secretly name <em>convert cards</em>. Whoever holds and plays those cards turns out to be an <strong>imposter King</strong> who joins the Rebel gang.
                                </p>
                            </div>
                        </div>
                    </InfoCard>
                    <p className="text-[#5C5751]">
                        Team membership is <strong>hidden at the start</strong>. An imposter King's true allegiance is only revealed the moment they play their convert card. Until then, everyone is a suspect.
                    </p>
                </Section>

                {/* ── CARD POINTS ── */}
                <Section id="card-points" title="Card Points">
                    <p className="text-[#5C5751]">Not all cards carry points. Only specific cards score — the rest are zero-point filler used for tricks.</p>

                    <InfoCard>
                        <div className="flex flex-col gap-4">
                            {/* 3S */}
                            <div className="flex items-center gap-4">
                                <Card code="3S" size="md" />
                                <div>
                                    <div className="font-bold text-[1.1rem] text-[#CE670E]">Three of Spades — 30 pts</div>
                                    <div className="text-[#8E8980] text-[0.9rem]">The most powerful card in the game. Worth more than any other single card.</div>
                                </div>
                            </div>

                            {/* Face cards */}
                            <div className="flex items-center gap-4">
                                <div className="flex gap-1.5 flex-wrap">
                                    <Card code="AS" size="sm" />
                                    <Card code="KH" size="sm" />
                                    <Card code="QD" size="sm" />
                                    <Card code="JC" size="sm" />
                                    <Card code="TC" size="sm" />
                                </div>
                                <div>
                                    <div className="font-bold text-[1.1rem] text-[#2D2A26]">A, K, Q, J, 10 — 10 pts each</div>
                                    <div className="text-[#8E8980] text-[0.9rem]">All suits. These are the backbone of scoring.</div>
                                </div>
                            </div>

                            {/* Fives */}
                            <div className="flex items-center gap-4">
                                <div className="flex gap-1.5">
                                    <Card code="5S" size="sm" />
                                    <Card code="5H" size="sm" />
                                    <Card code="5D" size="sm" />
                                    <Card code="5C" size="sm" />
                                </div>
                                <div>
                                    <div className="font-bold text-[1.1rem] text-[#2D2A26]">Fives — 5 pts each</div>
                                    <div className="text-[#8E8980] text-[0.9rem]">All suits. Small but meaningful in tight games.</div>
                                </div>
                            </div>

                            {/* Zero cards */}
                            <div className="flex items-center gap-4">
                                <div className="flex gap-1.5">
                                    <Card code="2S" size="sm" />
                                    <Card code="4H" size="sm" />
                                    <Card code="7D" size="sm" />
                                    <Card code="9C" size="sm" />
                                </div>
                                <div>
                                    <div className="font-bold text-[1.1rem] text-[#2D2A26]">2, 4, 6, 7, 8, 9 — 0 pts</div>
                                    <div className="text-[#8E8980] text-[0.9rem]">No point value. Useful for leading tricks strategically.</div>
                                </div>
                            </div>
                        </div>
                    </InfoCard>

                    <InfoCard>
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="text-[#5C5751] text-[0.95rem]">Total points in one deck</div>
                            <div className="text-[1.4rem] font-bold text-[#CE670E]">250 pts</div>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-3 mt-2">
                            <div className="text-[#5C5751] text-[0.95rem]">Total points in two decks</div>
                            <div className="text-[1.4rem] font-bold text-[#CE670E]">500 pts</div>
                        </div>
                    </InfoCard>
                </Section>

                {/* ── BIDDING ── */}
                <Section id="bidding" title="The Bidding Round">
                    <p className="text-[#5C5751]">
                        Before any cards are played, players compete in an auction to win the right to name the trump suit and pick their convert cards.
                    </p>
                    <InfoCard>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-start gap-3">
                                <Pill color="orange">Minimum bid</Pill>
                                <span className="text-[#5C5751] text-[0.95rem] pt-0.5">Set by the host before the game. Every bid must be at least this amount.</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <Pill color="orange">Raise by 5</Pill>
                                <span className="text-[#5C5751] text-[0.95rem] pt-0.5">Each new bid must be at least 5 points higher than the current highest bid.</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <Pill color="navy">Pass</Pill>
                                <span className="text-[#5C5751] text-[0.95rem] pt-0.5">You can pass at any point. Once you pass, you're out of the bidding.</span>
                            </div>
                        </div>
                    </InfoCard>
                    <p className="text-[#5C5751]">
                        Bidding goes around the table until only one player remains. That player becomes the <strong>Rebel Leader</strong> and is locked into their bid — they must collect that many points to win.
                    </p>
                </Section>

                {/* ── TRUMP & PARTNERS ── */}
                <Section id="trump" title="Trump &amp; Convert Cards">
                    <p className="text-[#5C5751]">
                        After winning the bid, the Rebel Leader privately selects a trump suit and names their <strong>convert cards</strong> — the secret signal to recruit imposter Kings into their rebel gang.
                    </p>

                    <div className="flex flex-col gap-3">
                        <PhaseStep num={1} title="Choose Trump Suit">
                            Pick any suit — ♠ ♥ ♦ ♣. Trump beats any non-trump card in a trick, regardless of rank.
                        </PhaseStep>
                        <PhaseStep num={2} title="Name Convert Cards">
                            The Rebel Leader names one or more specific cards (e.g. "Ace of Hearts", "Ten of Clubs"). Whoever holds and plays these cards turns out to be an imposter King and secretly defects to the Red Team (Rebels).
                        </PhaseStep>
                        <PhaseStep num={3} title="Cards are dealt — play begins">
                            Players can see their own hands but not their teammates. The Rebel Leader knows which cards will trigger the defection. The Kings must watch their own court for traitors.
                        </PhaseStep>
                    </div>

                    <InfoCard accent>
                        <p className="text-[0.95rem] text-[#5C5751]">
                            <strong className="text-[#CE670E]">2-Deck rule:</strong> When playing with two decks, duplicate cards exist. The Rebel Leader must also specify <em>which play</em> of that card converts them — e.g. "1st play of Ace of Hearts" or "2nd play".
                        </p>
                    </InfoCard>

                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[#5C5751] text-[0.95rem]">Example convert cards:</span>
                        <Card code="AH" size="sm" />
                        <Card code="TC" size="sm" />
                        <Card code="KD" size="sm" />
                    </div>
                </Section>

                {/* ── PLAYING TRICKS ── */}
                <Section id="playing" title="Playing Tricks">
                    <p className="text-[#5C5751]">
                        The game is played in rounds called <strong>tricks</strong>. Each trick, every player contributes one card. The highest-ranking card wins the trick.
                    </p>

                    <InfoCard>
                        <div className="flex flex-col gap-3.5">
                            <div>
                                <div className="font-bold text-[#2D2A26] mb-1">Follow Suit</div>
                                <div className="text-[#5C5751] text-[0.95rem]">If you have a card matching the lead suit, you <strong>must</strong> play it. No exceptions.</div>
                            </div>
                            <div className="w-full h-px bg-[#EBE7DC]" />
                            <div>
                                <div className="font-bold text-[#2D2A26] mb-1">Can't Follow Suit?</div>
                                <div className="text-[#5C5751] text-[0.95rem]">Play any card you like — a trump card to steal the trick, or a low-value card to discard.</div>
                            </div>
                            <div className="w-full h-px bg-[#EBE7DC]" />
                            <div>
                                <div className="font-bold text-[#2D2A26] mb-1">Winning a Trick</div>
                                <div className="text-[#5C5751] text-[0.95rem]">The highest trump wins if any trump was played. Otherwise, the highest card of the lead suit wins. The winner collects all point cards in the trick and leads the next one.</div>
                            </div>
                        </div>
                    </InfoCard>

                    <InfoCard accent>
                        <div className="font-bold text-[#CE670E] mb-1">Partner Reveal</div>
                        <p className="text-[0.95rem] text-[#5C5751]">
                            The moment a convert card hits the table, the player who played it is instantly added to the <strong className="text-red-700">Red Team</strong>. Their allegiance is revealed to everyone — they are exposed as an imposter King joining the Rebel gang.
                        </p>
                        <div className="flex gap-2 mt-3 items-center">
                            <Card code="AH" size="sm" />
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-[#CE670E]">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                            </svg>
                            <span className="text-[0.9rem] font-bold text-red-700"> One King joins the Rebels!</span>
                        </div>
                    </InfoCard>
                </Section>

                {/* ── SCORING ── */}
                <Section id="scoring" title="Scoring &amp; Winning">
                    <p className="text-[#5C5751]">
                        Once all cards are played, the Red Team (Rebels) tallies the points they collected across all tricks.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InfoCard>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-red-700">Red Team Wins</span>
                            </div>
                            <p className="text-[#5C5751] text-[0.95rem]">
                                Red's total points <strong>≥ the bid</strong>. The Rebel Leader and all defected partners win the round.
                            </p>
                        </InfoCard>
                        <InfoCard>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-[#0f2e57]">Blue Team Wins</span>
                            </div>
                            <p className="text-[#5C5751] text-[0.95rem]">
                                Red's total points <strong>&lt; the bid</strong>. The loyal Kings successfully defended their court.
                            </p>
                        </InfoCard>
                    </div>

                    <InfoCard accent>
                        <p className="text-[0.95rem] text-[#5C5751]">
                            <strong className="text-[#CE670E]">No revealed partners?</strong> If none of the convert cards were played during the round, the Rebel Leader wins alone — no partner bonus — but still must hit the bid.
                        </p>
                    </InfoCard>
                </Section>

                {/* ── GAME FLOW ── */}
                <Section id="flow" title="Game Flow at a Glance">
                    <div className="flex flex-col gap-3">
                        {[
                            ["Lobby", "Players join, pick avatars, host sets player count and decks."],
                            ["Deal", "Cards are dealt to all players by the host."],
                            ["Bidding", "Players bid in turns. Highest unmatched bid wins."],
                            ["Trump & Converts", "Rebel Leader names trump suit and convert cards."],
                            ["Tricks", "All players play one card per trick. Follow suit, or play freely."],
                            ["Reveal", "Convert cards played mid-game expose secret allies (defecting Kings)."],
                            ["Scoring", "Red Team (Rebels) wins if their collected points meet the bid. Otherwise Blue (Kings) wins."],
                        ].map(([phase, desc], i) => (
                            <PhaseStep key={phase} num={i + 1} title={phase}>
                                {desc}
                            </PhaseStep>
                        ))}
                    </div>
                </Section>

            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-[#E5E0D5] py-6 text-center text-[#8E8980] text-[0.9rem]">
                Good luck out there
            </footer>
        </div>
    )
}
