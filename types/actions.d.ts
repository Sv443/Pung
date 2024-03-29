import { LobbySettings, LobbyUser } from "./lobby";
import { GameStartedData, GameUpdate as GameUpdateObj } from "./game";
import { ErrCode } from "./errors";


//#MARKER dependent types


/**
 * The action type indicates the format of the data sent between client and server  
 *   
 * Naming convention:  
 *   
 * | Type | Actor |
 * | :-- | :-- |
 * | `ackFoo` | `server -> client` |
 * | `broadcastBar` | `server -> client` |
 * | other | usually `client -> server` |
 */
export type ActionType =
    // error
    "error" |
    // connection
    "handshake" | "ackHandshake" | "denyHandshake" | "logoff" |
    // ping
    "ping" | "pong" |
    // lobby
    "createLobby" | "joinLobby" | "lobbyNotFound" | "ackJoinLobby" |
    "changeLobbySettings" | "broadcastLobbyUpdate" |
    "deleteLobby" | "ackRemovedFromLobby" |
    "startGame" | "broadcastGameStarted" |
    // ingame
    "broadcastGameUpdate"
;

/** Indicates who sent this action */
declare type Actor = "client" | "server";


//#MARKER actions


/**
 * Base interface for actions
 * @template T The action's unique type / name
 */
declare interface ActionBase<T> {
    /** The action type indicates the format of the data sent between client and server */
    type: T;
    /** The action payload data */
    data: Record<string, unknown>;
}

//#SECTION handshake

/** Handshake is the first request, sent from client to server, to authorize and register with the server */
export interface Handshake extends ActionBase<"handshake"> {
    data: {
        /** The username that the client wants to have */
        username: string;
        /** ISO timestamp of the client */
        timestamp: string;
    };
}

/** This action is the response to a "handshake" action, sent from server to client */
export interface AckHandshake extends ActionBase<"ackHandshake"> {
    data: {
        /** The final username (after censoring slurs and stuff like that) */
        finalUsername: string;
        /** Session ID */
        sessionID: string;
        /**
         * RNG seed nonce based on a hash of the session ID, to ensure consistency with seeded RNG for the server and clients (when dealing with any kind of randomness).  
         * Theoretically ranges from `0` to `9 999 999 999 999 999` (16 nines), but is usually 16 digits and sometimes 15 long.
         */
        nonce: number;
    };
}

/** Sent from server to client to inform of a handshake being denied */
export interface DenyHandshake extends ActionBase<"denyHandshake"> {
    data: {
        /** Reason message */
        reason: string;
        /** The requested username of the client */
        username: string;
        /** ISO timestamp of the server */
        timestamp: string;
    }
}

/** Sent from a client to the server to indicate it wants to log off */
export interface Logoff extends ActionBase<"logoff"> {
    data: {
        sessionID: string;
        /** ISO format timestamp */
        timestamp: string;
    };
}

//#SECTION ping

/** Sent from client to server to ping */
declare interface Ping extends ActionBase<"ping"> {
    data: {
        /** Timestamp of the client in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format */
        time: string;
    };
}

/** Sent from server to client in response to a ping */
declare interface Pong extends ActionBase<"pong"> {
    data: {
        /** Timestamp of the server in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format */
        serverTime: string;
        /** Original timestamp of the client in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format */
        clientTime: string;
        /** Connection latency in milliseconds (depending on client & server's system times) */
        latency: number;
        /** Internal processing latency in milliseconds */
        internalLatency: number;
    };
}

//#SECTION lobby

/** Sent from client to server to create a lobby */
declare interface CreateLobby extends ActionBase<"createLobby"> {
    data: {
        /** Client username */
        username: string;
        /** The session ID of the client */
        sessionID: string;
    };
}

/** Sent from client to server to ask to join a lobby */
declare interface JoinLobby extends ActionBase<"joinLobby"> {
    data: {
        username: string;
        sessionID: string;
        lobbyID: string;
    };
}

/** Sent from server to client to tell the client */
declare interface LobbyNotFound extends ActionBase<"lobbyNotFound"> {
    data: {
        lobbyID: string;
    };
}

/** Sent from server to client to acknowledge joining a lobby */
declare interface AckJoinLobby extends ActionBase<"ackJoinLobby"> {
    data: {
        isAdmin: boolean;
        lobbyID: string;
        initialSettings: LobbySettings;
    }
}

/** Sent from admin client to server to change lobby settings */
declare interface ChangeLobbySettings extends ActionBase<"changeLobbySettings"> {
    data: {
        /** Needed for authorizing the admin client */
        sessionID: string;
        /** The proposed new lobby settings */
        settings: LobbySettings;
    };
}

/** Sent from server to all clients after lobby settings have been changed or user(s) have joined or left */
declare interface BroadcastLobbyUpdate extends ActionBase<"broadcastLobbyUpdate"> {
    data: {
        settings: LobbySettings;
        players: LobbyUser[];
    }
}

/** Sent from admin client to server to request lobby deletion */
declare interface DeleteLobby extends ActionBase<"deleteLobby"> {
    data: {
        /** ID of the lobby to delete */
        lobbyID: string;
        /** Session ID of a lobby admin */
        sessionID: string;
    }
}

/** Sent from server to client to inform about removal from lobby */
declare interface AckRemovedFromLobby extends ActionBase<"ackRemovedFromLobby"> {
    data: {
        reason: "adminLeft";
    }
}

/** Sent from admin client to server to request the game to start */
declare interface StartGame extends ActionBase<"startGame"> {
    data: {
        /** Which lobby to start */
        lobbyID: string;
        /** The sessionID of the admin client */
        sessionID: string;
    }
}

/** Sent from server to all clients in the lobby to inform about the game starting */
declare interface BroadcastGameStarted extends ActionBase<"broadcastGameStarted"> {
    data: GameStartedData;
}

//#SECTION ingame

/** This action sends game updates, from server to client */
export interface GameUpdate extends ActionBase<"broadcastGameUpdate"> {
    data: GameUpdateObj;
}

//#SECTION error

/** This action is sent between any two actors and is used to indicate an error */
export interface ErrorAction {
    type: "error";
    /** What action this error is responding to */
    responseTo?: ActionType;
    /** Error code */
    code: ErrCode;
    /** Name of the error */
    name: string;
    message?: string;
}

//#MARKER composite type

/** Any action of any type */
export type Action =
    // error
    ErrorAction |
    // connection
    Handshake | AckHandshake | DenyHandshake | Logoff |
    // ping
    Ping | Pong |
    // lobby
    CreateLobby | JoinLobby | LobbyNotFound | AckJoinLobby |
    ChangeLobbySettings | BroadcastLobbyUpdate |
    DeleteLobby | AckRemovedFromLobby |
    StartGame | BroadcastGameStarted |
    // ingame
    GameUpdate
;

declare interface ActionDefaultProps {
    /** Indicates what the data object will look like */
    type: string;
    /** Indicates whether the actor who sent this has encountered an error */
    error: boolean;
    /** Indicates who sent this action */
    actor: Actor;
    /** Timestamp of when the action was sent, in the actor's system time */
    timestamp: number;
}

/** Includes properties that are needed for transfer between the server's and client's ActionHandler's */
export type TransferAction = ActionDefaultProps & Action;
