/** The game's difficulty */
export type Difficulty = "easy" | "medium" | "hard";

/** Data broadcasted to each client when the game starts */
export interface GameStartedData {
    /** Just to confirm */
    lobbyID: string;
}

/** Describes a player who is currently in game */
export interface Player {
    sessionID: string;
    isAdmin: boolean;
    /** Indicates the position of a player character's center cell */
    pos: number;
    /** On which physical side the player is on */
    side: PlayerSide;
}

/** Indicates one of 8 directions (cardinal + diagonal) */
export type Direction = 
    "u"  | "ur" | "r"  |
    "dr" | "d"  | "dl" |
    "l"  | "ul"
;

/** The physical side a player is on (left/right) */
export type PlayerSide = "l" | "r";

/** Describes a simple integer position in 2D space */
export interface Position {
    x: number;
    y: number;
}

export interface GameFieldSettings {
    outStream?: NodeJS.WriteStream;
    winScore?: number;
}

/** Contains all info about a game's ball */
export interface BallInfo {
    pos?: Position;
    dir?: Direction;
}

/** Contains information about a player */
declare interface PlayerInfo extends Player {
    /** Position of the player's center cell along the vertical axis */
    pos: number;
    /** Which side of the horizontal field the player is on */
    side: PlayerSide;
}

/**
 * The data that's broadcasted to all clients when the game updates.  
 * Some properties are partial, because the server will try to not send the same data over and over again (TODO: implement into server).
 */
export interface GameUpdate {
    lobbyID: string;
    players: PlayerInfo[];
    ball: BallInfo;
}
