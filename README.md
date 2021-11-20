# Pung
### Command line multiplayer pong game

<br>

## Table of Contents
- [Installation](#installation)
- [Security](#security)
- [FAQ](#faq)
    - [Why?](#why)
    - [How?](#how)
    - [Help!](#help)
- [Legal stuff](#legal-stuff)
    - [License](#license)

<br><br>

## Installation
1. Install [Node.js](https://nodejs.org/) (version 16 recommended)
2. Clone or download (and unzip) the game to get the latest snapshot
3. Open a terminal in the game's folder, where the `package.json` file is located
4. Run `npm start` or `node client` to start the game normally
    > Run `npm run server` or `node server` to start a server instance of the game

<br><br>

## Security
- The default server encrypts traffic with HTTPS.  
    Be aware I can't ensure security of user-hosted servers.
- The only directly identifying information that is transmitted is your username.  
    It will not be stored by the server, but it could potentially be stored by other users, so be aware of that.
- All authentication (who is who & which player is the lobby's admin) is done through cryptographically securely generated unique session identifiers.  
    If you feel like you were compromised, re-launching the game will give you a new username and session ID and you will be 100% anonymous again.

If you have any other questions or would like to report a security issue, please [refer to our security policy.](./.github/SECURITY.md#readme)

<br><br>

## FAQ
This section contains additional information about this project, in FAQ style:

<br>

## Why?
- I wanted to make a project using websockets
- I wanted to make a multiplayer CLI game
- Why not?

<br>

### How?
This project includes some [`client`](./client/), [`server`](./server/) and [`common`](./common/) / shared code.  
  
When you launch this game normally, the client code is executed.  
(When you launch the server by using `npm run server`, the server code is executed instead.)  
  
After you enter your username, the client contacts the server to initialize the session (this is internally called "handshake").  
The server now generates a cryptographically secure session ID, sanitizes your username, and returns that data to your client.  
  
Now your client has its session ID, which is used by the server to uniquely identify you without knowing anything about you.  
This ID is also how the server knows who is the lobby admin.

<br>

### Help!
If you need help, please [join my Discord server](https://dc.sv443.net/) or send me an [E-Mail.](mailto:contact@sv443.net?subject=Pung)  
If your issue is with code, please [open a GitHub issue.](https://github.com/Sv443/Pung/issues/new/choose)
  
<br><br>

## Legal stuff

<br>

### License
This game is licensed under the MIT license. [Click here to view the full license text.](./LICENSE.txt)