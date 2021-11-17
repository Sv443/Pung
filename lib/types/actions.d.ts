
export type ActionType = "handshake" | "ackHandshake" | "update";

declare type Actor = "client" | "server";

export interface ActionBase {
    /** The type of action */
    type: ActionType;
    /** Where this action originated from */
    actor: Actor;
    /** The action payload data */
    data: any;
    /** Timestamp of when the action was sent, in the actor's system time */
    timestamp: number;
}

export interface HandshakeAction extends ActionBase {
    type: "handshake";
    data: {
        username: string;
    };
}

export interface AckHandshakeAction extends ActionBase {
    type: "ackHandshake";
    data: {
        /** The final username (after censoring slurs and shit like that) */
        finalUsername: string;
        /** Session ID */
        sessionID: string;
    };
}

export interface UpdateAction extends ActionBase {
    type: "update";
    data: {
        // TODO: some of these props don't need to be transmitted on every frame
        /** Info about the game */
        game: {
            /** Score needed to win */
            winScore: number;
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

/** Any action of any type */
export type Action = HandshakeAction | AckHandshakeAction | UpdateAction;
