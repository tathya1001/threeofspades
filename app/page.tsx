"use client"

import { useState } from "react"
import { socket } from "../lib/socket"
import { useRouter } from "next/navigation"

export default function Home() {
  const [name, setName] = useState("")
  const [roomId, setRoomId] = useState("")
  const [numPlayers, setNumPlayers] = useState(3)
  const [numDecks, setNumDecks] = useState(1)
  const router = useRouter()

  const createRoom = () => {
    // Pass config object to server
    socket.emit("create-room", { name, numPlayers, numDecks }, (roomId: string) => {
      router.push(`/room/${roomId}`)
    })
  }

  const joinRoom = () => {
    router.push(`/room/${roomId}?name=${name}`)
  }

  return (
    <div className="min-h-screen h-[100vh] bg-[#111] flex items-center justify-center p-6 relative overflow-hidden">
      <style>{`
        @keyframes bg-scroll {
          0%   { background-position-x: 0; }
          100% { background-position-x: -1000px; }
        }
      `}</style>

      {/* Background carousel — seamless infinite scroll via repeating background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url('/bgcards.png')",
          backgroundRepeat: "repeat-x",
          backgroundSize: "auto 100%",
          backgroundPosition: "center",
          animation: "bg-scroll 90s linear infinite",
          opacity: 0.5,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div className="w-full max-w-[860px] min-h-[500px] rounded-[22px] px-[clamp(1.5rem,8vw,5rem)] py-[clamp(2.5rem,6vw,4rem)] flex flex-col items-center relative z-10">

        {/* Title */}
        <h1 className="text-[clamp(2rem,5vw,2.8rem)] text-[#e8e8e8] mb-6 text-center tracking-wide">
          Three of Spades
        </h1>

        {/* Name Input */}
        <input
          className="w-full max-w-[340px] bg-transparent border border-white/60 rounded-[10px] px-4 py-2 text-center text-[1.35rem] text-[#ddd] outline-none focus:border-white/90 placeholder:text-white/50"
          placeholder="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Divider dots */}
        <div className="text-[1.3rem] text-white/60 tracking-[0.25em] my-4">
          • • •
        </div>

        {/* Players Slider */}
        <div className="w-full max-w-[480px] mb-6">
          <span className="block text-center text-[1.2rem] text-white/70 mb-2">
            number of players
          </span>

          <div className="relative w-full px-1">
            <input
              type="range"
              min={4}
              max={10}
              value={numPlayers}
              onChange={(e) => setNumPlayers(Number(e.target.value))}
              className="w-full h-[2px] bg-white/50 rounded cursor-pointer appearance-none"
            />

            {/* Ticks */}
            <div className="flex justify-between mt-2 px-[2px]">
              {[4, 5, 6, 7, 8, 9, 10].map((n) => (
                <span
                  key={n}
                  className={`text-[1.1rem] ${n === numPlayers ? "text-white/90" : "text-white/50"
                    }`}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Decks Slider */}
        <div className="w-full flex flex-col max-w-[480px] mb-6 items-center">
          <span className="block text-center text-[1.2rem] text-white/70 mb-2">
            number of decks
          </span>

          <div className="relative w-[180px] justify-center px-1">
            <input
              type="range"
              min={1}
              max={2}
              value={numDecks}
              onChange={(e) => setNumDecks(Number(e.target.value))}
              className="w-full h-[2px] bg-white/50 rounded cursor-pointer appearance-none"
            />

            {/* Ticks */}
            <div className="flex justify-between mt-2 px-[2px]">
              {[1, 2].map((n) => (
                <span
                  key={n}
                  className={`text-[1.1rem] ${n === numDecks ? "text-white/90" : "text-white/50"
                    }`}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Host Button */}
        <button
          onClick={createRoom}
          className="border border-white/60 rounded-[9px] px-6 py-2 text-[1.25rem] text-[#ddd] hover:border-white hover:text-white transition"
        >
          host game
        </button>

        {/* Divider */}
        <div className="text-[1.3rem] text-white/60 tracking-[0.25em] my-4">
          • • •
        </div>

        {/* Room Input */}
        <input
          className="w-full max-w-[340px] bg-transparent border border-white/60 rounded-[10px] px-4 py-2 text-center text-[1.35rem] text-[#ddd] outline-none focus:border-white/90 placeholder:text-white/50"
          placeholder="room code"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />

        {/* Join Button */}
        <button
          onClick={joinRoom}
          className="mt-3 border border-white/60 rounded-[9px] px-6 py-2 text-[1.25rem] text-[#ddd] hover:border-white hover:text-white transition"
        >
          join game
        </button>
      </div>
    </div>
  )
}