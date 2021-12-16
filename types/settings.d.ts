import { Actor } from "./actions";

export interface ClientSettings {
    /** Host of the server */
    serverHost?: string;
    /** Port of the server */
    serverPort: number;
}

export interface ProxyServerSettings {}

export interface Settings {
    [key: Actor]: ClientSettings | ProxyServerSettings;

    client: ClientSettings;
    proxyServer: ProxyServerSettings;
}
