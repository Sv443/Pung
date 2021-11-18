import { Difficulty } from "./game";


/** The settings of a lobby */
export interface LobbySettings {
    /** Score needed to win */
    winScore: number;
    /** The game's difficulty */
    difficulty: Difficulty;
}

/** A user in a lobby */
export interface LobbyUser {
    sessionID: string;
    isAdmin: boolean;
}