// localStorage can throw (private browsing, blocked storage), and losing a
// remembered name is never worth an error screen, so every access is guarded.

export const storageKeys = {
    lastName: "tos_last_name",
    lastRoom: "tos_last_room_id",
    seatToken: (roomId: string, name: string) => `tos_token_${roomId}_${name}`,
}

export function readStorage(key: string): string | null {
    try {
        return window.localStorage.getItem(key)
    } catch {
        return null
    }
}

export function writeStorage(key: string, value: string) {
    try {
        window.localStorage.setItem(key, value)
    } catch {
        // Nothing useful to do; the player just won't get a rejoin shortcut.
    }
}
