import { LobbySettings, LobbyUser } from "./lobby";


//#MARKER dependent types


/**
 * The action type indicates the format of the data sent between client and server  
 *   
 * | Type | Actor |
 * | :-- | :-- |
 * | normal | client -> server |
 * | `ack` | server -> client |
 * | `broadcast` | server -> client |
 */
export type ActionType =
    // connection
    "handshake" | "ackHandshake" |
    // lobby
    "createLobby" | "joinLobby" | "ackJoinLobby" |
    "changeLobbySettings" | "broadcastLobbyUpdate" |
    "deleteLobby" | "ackRemovedFromLobby" |
    // ingame
    "broadcastGameUpdate"
;

/** Indicates who sent this action */
declare type Actor = "client" | "server";


//#MARKER actions


/** Base interface for actions */
declare interface ActionBase {
    /** The action type indicates the format of the data sent between client and server */
    type: ActionType;
    /** The action payload data */
    data: any;
}

//#SECTION handshake

/** Handshake is the first request, sent from client to server, to authorize and register with the server */
export interface Handshake extends ActionBase {
    type: "handshake";
    data: {
        username: string;
    };
}

/** This action is the response to a "handshake" action, sent from server to client */
export interface AckHandshake extends ActionBase {
    type: "ackHandshake";
    data: {
        /** The final username (after censoring slurs and shit like that) */
        finalUsername: string;
        /** Session ID */
        sessionID: string;
    };
}

//#SECTION lobby

/** Sent from client to server to create a lobby */
declare interface CreateLobby extends ActionBase {
    type: "createLobby";
    data: {
        /** Client username */
        username: string;
        /** The session ID of the client */
        sessionID: string;
    };
}

/** Sent from client to server to ask to join a lobby */
declare interface JoinLobby extends ActionBase {
    type: "joinLobby";
    data: {
        // TODO:
        lobbyID: string;
    };
}

/** Sent from server to client to acknowledge joining a lobby */
declare interface AckJoinLobby extends ActionBase {
    type: "ackJoinLobby";
    data: {
        isAdmin: boolean;
        lobbyID: string;
        initialSettings: LobbySettings;
    }
}

/** Sent from admin client to server to change lobby settings */
declare interface ChangeLobbySettings extends ActionBase {
    type: "changeLobbySettings";
    data: {
        /** Needed for authorizing the admin client */
        sessionID: string;
        /** The proposed new lobby settings */
        settings: LobbySettings;
    };
}

/** Sent from server to all clients after lobby settings have been changed or user(s) have joined or left */
declare interface BroadcastLobbyUpdate extends ActionBase {
    type: "broadcastLobbyUpdate";
    data: {
        settings: LobbySettings;
        players: LobbyUser[];
    }
}

/** Sent from admin client to server to request lobby deletion */
declare interface DeleteLobby extends ActionBase {
    type: "deleteLobby";
    data: {
        /** ID of the lobby to delete */
        lobbyID: string;
        /** Session ID of a lobby admin */
        sessionID: string;
    }
}

/** Sent from server to client to inform about removal from lobby */
declare interface AckRemovedFromLobby extends ActionBase {
    type: "ackRemovedFromLobby";
    data: {
        reason: "adminLeft";
    }
}

//#SECTION ingame

/** This action sends game updates, from server to client */
export interface GameUpdate extends ActionBase {
    type: "broadcastGameUpdate";
    data: {
        // TODO: some of these props don't need to be transmitted on every frame
        /** Info about the game */
        game: {
            /** Size of the playing field */
            size: {
                w: number;
                h: number;
            };
        };
        /** Info about the players */
        players: [
            {
                id: string;
                score: number;
                x: number;
                y: number;
            }
        ];
        /** Info about the ball */
        ball: {
            x: number;
            y: number;
        };
    };
}

//#MARKER composite type

/** Any action of any type */
export type Action =
    // connection
    Handshake | AckHandshake |
    // lobby
    CreateLobby | JoinLobby | AckJoinLobby |
    ChangeLobbySettings | BroadcastLobbyUpdate |
    DeleteLobby | AckRemovedFromLobby |
    // ingame
    GameUpdate
;

/** Includes properties that are needed for transfer between the server's and client's ActionHandler's */
export type TransferAction = Action & {
    /** Indicates who sent this action */
    actor: Actor;
    /** Timestamp of when the action was sent, in the actor's system time */
    timestamp: number;
};