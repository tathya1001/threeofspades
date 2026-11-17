import type { Metadata } from "next"
import Link from "next/link"
import { PlayingCard } from "@/components/PlayingCard"
import { ScrollingBackdrop } from "@/components/ScrollingBackdrop"

export const metadata: Metadata = {
    title: "How to Play",
    description: "Rules for Kings and Rebels: bidding, trump, secret partners and scoring.",
}

const CARD_SIZES = {
    sm: { width: 36, height: 52 },
    md: { width: 48, height: 68 },
    lg: { width: 64, height: 90 },
}

function Card({ code, size = "md" }: { code: string; size?: keyof typeof CARD_SIZES }) {
    return <PlayingCard card={code} {...CARD_SIZES[size]} className="inline-block rounded-[4px] shadow-sm" />
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    return (
        <section id={id} className="w-full max-w-[720px] mx-auto mb-12 scroll-mt-24">
            <div className="flex items-center gap-3 mb-5">
                <h2 className="text-[1.6rem] font-bold text-[#2D2A26] tracking-wide leading-none">{title}</h2>
                <div className="flex-1 h-px bg-[#D8D3C5] ml-2" />
            </div>
            <div className="flex flex-col gap-4 text-[1.1rem] text-[#2D2A26] leading-relaxed">{children}</div>
        </section>
    )
}

const PILL_COLORS = {
    orange: "bg-[#CE670E]/10 text-[#CE670E] border-[#CE670E]/25",
    navy: "bg-[#0f2e57]/10 text-[#0f2e57] border-[#0f2e57]/25",
    red: "bg-red-500/10 text-red-700 border-red-500/25",
}

function Pill({ children, color = "orange" }: { children: React.ReactNode; color?: keyof typeof PILL_COLORS }) {
    return (
        <span className={`inline-flex items-center shrink-0 px-3 py-0.5 rounded-full border text-[0.9rem] font-bold ${PILL_COLORS[color]}`}>
            {children}
        </span>
    )
}

function InfoCard({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
    return (
        <div className={`rounded-[16px] border p-5 ${accent ? "bg-[#CE670E]/5 border-[#CE670E]/20" : "bg-[#FDFCFB] border-[#E5E0D5]"}`}>
            {children}
        </div>
    )
}

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
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

const SECTIONS = [
    ["#teams", "Teams"],
    ["#card-points", "Card Points"],
    ["#bidding", "Bidding"],
    ["#trump", "Trump & Partners"],
    ["#playing", "Playing Tricks"],
    ["#scoring", "Scoring"],
]

const GAME_FLOW = [
    ["Lobby", "Players join, pick avatars, and the host sets the player count and decks."],
    ["Deal", "The host deals every card out."],
    ["Bidding", "Players bid in turns. The last bidder standing wins."],
    ["Trump & Turning Cards", "The Rebel Leader names the trump suit and the turning cards."],
    ["Tricks", "Everyone plays one card per trick. Follow suit if you can, otherwise play anything."],
    ["Reveal", "Each turning card that hits the table exposes a hidden ally."],
    ["Scoring", "The Rebels win if their points meet the bid. Otherwise the Kings win."],
]

export default function RulesPage() {
    return (
        <div className="min-h-screen bg-[#F3EFE6] text-[#2D2A26] relative overflow-x-hidden">
            <ScrollingBackdrop fixed />

            <header className="sticky top-0 z-20 bg-[#F3EFE6]/90 backdrop-blur-sm border-b border-[#E5E0D5]">
                <div className="max-w-[720px] mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-[#8E8980] hover:text-[#CE670E] transition-all text-[1rem] group">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 group-hover:-translate-x-1 transition-transform" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                        </svg>
                        Back
                    </Link>
                    <h1 className="text-[1.4rem] font-bold text-[#2D2A26] tracking-wide">How to Play</h1>
                    <div className="w-16" aria-hidden="true" />
                </div>
            </header>

            <div className="relative z-10 max-w-[720px] mx-auto px-6 pt-10 pb-8 text-center">
                <div className="flex justify-center gap-2 mb-5">
                    {["KS", "3S", "AS", "KH", "AH"].map(code => <Card key={code} code={code} size="lg" />)}
                </div>
                <h2 className="text-[2.2rem] font-bold text-[#2D2A26] tracking-wide mb-2">Kings and Rebels</h2>
                <p className="text-[#8E8980] text-[1.05rem] max-w-[480px] mx-auto leading-relaxed">
                    A real-time multiplayer trick-taking card game of hidden alliances, bold bids, and secret partners.
                </p>
            </div>

            <nav className="relative z-10 max-w-[720px] mx-auto px-6 mb-10" aria-label="Sections">
                <div className="flex flex-wrap gap-2 justify-center">
                    {SECTIONS.map(([href, label]) => (
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

            <main className="relative z-10 px-6 pb-24">
                <Section id="teams" title="The Two Teams">
                    <InfoCard accent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <div className="font-bold text-[1.15rem] text-[#0f2e57] mb-2">Blue Team: Kings</div>
                                <p className="text-[#5C5751] text-[0.95rem]">
                                    Everyone except the winning bidder starts as a <strong>King</strong>. They don&rsquo;t know which of
                                    their fellow Kings is secretly working for the other side, but together they must stop the Rebel
                                    Leader from making the bid.
                                </p>
                            </div>
                            <div>
                                <div className="font-bold text-[1.15rem] text-red-700 mb-2">Red Team: Rebels</div>
                                <p className="text-[#5C5751] text-[0.95rem]">
                                    The winning bidder becomes the <strong>Rebel Leader</strong> and names one or more
                                    <em> turning cards</em>. Whoever holds and plays one of those cards is revealed as a Rebel and
                                    joins the Leader&rsquo;s team.
                                </p>
                            </div>
                        </div>
                    </InfoCard>
                    <p className="text-[#5C5751]">
                        Teams are <strong>hidden at the start</strong>. A Rebel&rsquo;s allegiance only comes out the moment they
                        play their turning card. Until then, everyone is a suspect.
                    </p>
                </Section>

                <Section id="card-points" title="Card Points">
                    <p className="text-[#5C5751]">Only some cards carry points. The rest are there to win or dodge tricks.</p>

                    <InfoCard>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                                <Card code="3S" size="md" />
                                <div>
                                    <div className="font-bold text-[1.1rem] text-[#CE670E]">Three of Spades: 30 pts</div>
                                    <div className="text-[#8E8980] text-[0.9rem]">Worth more than any other single card.</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex gap-1.5 flex-wrap">
                                    {["AS", "KH", "QD", "JC", "TC"].map(code => <Card key={code} code={code} size="sm" />)}
                                </div>
                                <div>
                                    <div className="font-bold text-[1.1rem] text-[#2D2A26]">A, K, Q, J, 10: 10 pts each</div>
                                    <div className="text-[#8E8980] text-[0.9rem]">In every suit. Most of the scoring comes from these.</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex gap-1.5">
                                    {["5S", "5H", "5D", "5C"].map(code => <Card key={code} code={code} size="sm" />)}
                                </div>
                                <div>
                                    <div className="font-bold text-[1.1rem] text-[#2D2A26]">Fives: 5 pts each</div>
                                    <div className="text-[#8E8980] text-[0.9rem]">In every suit. Small, but they decide close games.</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex gap-1.5">
                                    {["2S", "4H", "7D", "9C"].map(code => <Card key={code} code={code} size="sm" />)}
                                </div>
                                <div>
                                    <div className="font-bold text-[1.1rem] text-[#2D2A26]">Everything else: 0 pts</div>
                                    <div className="text-[#8E8980] text-[0.9rem]">Useful for leading safely or throwing away.</div>
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

                    <p className="text-[#5C5751] text-[0.95rem]">
                        <strong>Uneven tables:</strong> if the deck doesn&rsquo;t split evenly between players, the lowest
                        zero-point cards (twos first) are set aside before dealing. Every point card is always in play.
                    </p>
                </Section>

                <Section id="bidding" title="The Bidding Round">
                    <p className="text-[#5C5751]">
                        Before any cards are played, players bid for the right to name trump and pick the turning cards.
                    </p>
                    <InfoCard>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-start gap-3">
                                <Pill color="navy">Open or pass</Pill>
                                <span className="text-[#5C5751] text-[0.95rem] pt-0.5">
                                    Going round the table, each player can open the bidding at the minimum (or higher) or pass to the next player.
                                </span>
                            </div>
                            <div className="flex items-start gap-3">
                                <Pill color="orange">Raise by 5+</Pill>
                                <span className="text-[#5C5751] text-[0.95rem] pt-0.5">
                                    Once bidding is open, each new bid must beat the current one by at least 5 points.
                                </span>
                            </div>
                            <div className="flex items-start gap-3">
                                <Pill color="red">Forfeit</Pill>
                                <span className="text-[#5C5751] text-[0.95rem] pt-0.5">
                                    Don&rsquo;t want to go higher? Forfeit, and you&rsquo;re out of the bidding for this round.
                                </span>
                            </div>
                        </div>
                    </InfoCard>
                    <p className="text-[#5C5751]">
                        Bidding continues until only one player is left. They become the <strong>Rebel Leader</strong> and must
                        collect at least their bid to win. Higher bids earn more partners, as shown in the partner thresholds in
                        the lobby.
                    </p>
                </Section>

                <Section id="trump" title="Trump & Turning Cards">
                    <p className="text-[#5C5751]">
                        After winning the bid, the Rebel Leader picks a trump suit and names their <strong>turning cards</strong>,
                        one for each partner they&rsquo;ve earned.
                    </p>

                    <div className="flex flex-col gap-3">
                        <Step num={1} title="Choose the trump suit">
                            Any suit: ♠ ♥ ♦ ♣. A trump beats every card of the other suits, whatever its rank.
                        </Step>
                        <Step num={2} title="Name the turning cards">
                            Specific cards such as &ldquo;Ace of Hearts&rdquo; or &ldquo;10 of Clubs&rdquo;. Whoever plays one of them
                            joins the Rebels.
                        </Step>
                        <Step num={3} title="Play begins">
                            Everyone sees their own hand and the turning cards, but not who holds them. The Leader opens the first trick.
                        </Step>
                    </div>

                    <InfoCard accent>
                        <p className="text-[0.95rem] text-[#5C5751]">
                            <strong className="text-[#CE670E]">Two-deck rule:</strong> with two decks every card exists twice, so the
                            Leader also says <em>which</em> copy counts: the 1st or 2nd time it&rsquo;s played, or 0 for &ldquo;the copy
                            I&rsquo;m not holding&rdquo;.
                        </p>
                    </InfoCard>

                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[#5C5751] text-[0.95rem]">Example turning cards:</span>
                        {["AH", "TC", "KD"].map(code => <Card key={code} code={code} size="sm" />)}
                    </div>
                </Section>

                <Section id="playing" title="Playing Tricks">
                    <p className="text-[#5C5751]">
                        The game is played in <strong>tricks</strong> (shown as &ldquo;hands&rdquo; in game). Every player adds one card,
                        and the strongest card takes the trick.
                    </p>

                    <InfoCard>
                        <div className="flex flex-col gap-3.5">
                            <div>
                                <div className="font-bold text-[#2D2A26] mb-1">Follow suit</div>
                                <div className="text-[#5C5751] text-[0.95rem]">If you have a card of the suit that was led, you <strong>must</strong> play one.</div>
                            </div>
                            <div className="w-full h-px bg-[#EBE7DC]" />
                            <div>
                                <div className="font-bold text-[#2D2A26] mb-1">Can&rsquo;t follow suit?</div>
                                <div className="text-[#5C5751] text-[0.95rem]">Play anything: a trump to steal the trick, or a low card to throw away.</div>
                            </div>
                            <div className="w-full h-px bg-[#EBE7DC]" />
                            <div>
                                <div className="font-bold text-[#2D2A26] mb-1">Winning a trick</div>
                                <div className="text-[#5C5751] text-[0.95rem]">
                                    The highest trump wins if any trump was played. Otherwise the highest card of the suit led wins.
                                    The winner collects every point in the trick and leads the next one.
                                </div>
                            </div>
                        </div>
                    </InfoCard>

                    <InfoCard accent>
                        <div className="font-bold text-[#CE670E] mb-1">Partner reveal</div>
                        <p className="text-[0.95rem] text-[#5C5751]">
                            The moment a turning card hits the table, whoever played it moves to the <strong className="text-red-700">Red Team</strong>,
                            and everyone can see it.
                        </p>
                        <div className="flex gap-2 mt-3 items-center">
                            <Card code="AH" size="sm" />
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-[#CE670E]" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                            </svg>
                            <span className="text-[0.9rem] font-bold text-red-700">One King joins the Rebels!</span>
                        </div>
                    </InfoCard>
                </Section>

                <Section id="scoring" title="Scoring & Winning">
                    <p className="text-[#5C5751]">Once every card has been played, the Rebels add up the points they collected.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InfoCard>
                            <div className="font-bold text-red-700 mb-2">Rebels win</div>
                            <p className="text-[#5C5751] text-[0.95rem]">
                                The Red Team&rsquo;s points are <strong>at least the bid</strong>. The Leader and every revealed partner win.
                            </p>
                        </InfoCard>
                        <InfoCard>
                            <div className="font-bold text-[#0f2e57] mb-2">Kings win</div>
                            <p className="text-[#5C5751] text-[0.95rem]">
                                The Red Team&rsquo;s points fall <strong>short of the bid</strong>. The loyal Kings have defended their court.
                            </p>
                        </InfoCard>
                    </div>

                    <InfoCard accent>
                        <p className="text-[0.95rem] text-[#5C5751]">
                            <strong className="text-[#CE670E]">No partners revealed?</strong> If none of the turning cards get played, the
                            Rebel Leader plays alone and still has to make the bid.
                        </p>
                    </InfoCard>
                </Section>

                <Section id="flow" title="Game Flow at a Glance">
                    <div className="flex flex-col gap-3">
                        {GAME_FLOW.map(([phase, description], i) => (
                            <Step key={phase} num={i + 1} title={phase}>{description}</Step>
                        ))}
                    </div>
                </Section>
            </main>

            <footer className="relative z-10 border-t border-[#E5E0D5] py-6 text-center text-[#8E8980] text-[0.9rem]">
                Good luck out there
            </footer>
        </div>
    )
}
