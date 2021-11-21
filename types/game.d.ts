/** The game's difficulty */
export type Difficulty = "easy" | "medium" | "hard";

/** Data broadcasted to each client when the game starts */
export interface GameStartedData {
    /** Just to confirm */
    lobbyID: string;
};

export interface Player {
    sessionID: string;
    isAdmin: boolean;
    /** Indicates the position of a player character's center cell */
    pos: number;
}

/** Indicates one of 8 directions (cardinal + diagonal) */
export type Direction = 
    "u"  | "ur" | "r"  |
    "dr" | "d"  | "dl" |
    "l"  | "ul"
;

/** Describes a simple integer position in 2D space */
export interface Position {
    x: number;
    y: number;
}
