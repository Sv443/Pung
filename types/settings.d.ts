import { Actor } from "./actions";


export interface ClientSettings {
    /** Host of the server */
    serverHost?: string;
    /** Port of the server */
    serverPort: number;
}

export interface ServerSettings {

}

export interface Settings {
    [key: Actor]: ClientSettings | ServerSettings;

    client: ClientSettings;
    server: ServerSettings;
}
