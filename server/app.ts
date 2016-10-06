import * as path from "path";
import * as express from "express";
import * as socketIO from "socket.io";

import requestLogger from "./middleware/requestLogger";
import * as gameLogic from "./gameLogic";


function shuffle<T>(array: T[]) {
    let currentIndex = array.length;
    let copy = array.slice();

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
        // Pick a remaining element...
        const randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        const temporaryValue = copy[currentIndex];
        copy[currentIndex] = copy[randomIndex];
        copy[randomIndex] = temporaryValue;
    }

    return copy;
}

const knownPlayers: { [id: string]: Player } = {};
const connectedPlayers: { [id: string]: SocketIO.Socket } = {};
const activeGames: ServerGame[] = [];
const gamesByPlayer: { [id: string]: ServerGame } = {};

const range: number[] = [];
for (let i = 0; i < 50; i++) range.push(i);
const fakeFriends: UserInfo[] = range.map((_, i) => ({
    name: `Chris ${i}`,
    id: `fake-person-${i + 1}`,
    picture: {
        data: {
            is_silhouette: false,
            url: `static/people/image-${i + 1}.png`,
        },
    },
}));

function findGameForUser(userId: string) {
    return gamesByPlayer[userId];
}

export default class WebApi {
    constructor(private app: express.Express, private port: number) {
        this.configureMiddleware(app);
        this.configureRoutes(app);
    }

    private configureMiddleware(app: express.Express) {
        app.use(requestLogger);
    }

    private configureRoutes(app: express.Express) {
        const indexRouter = express.Router();
        indexRouter.get("/", (request: express.Request, response: express.Response) => {
            response.sendFile(path.resolve(`${__dirname}/../index.html`));
        });
        app.use("/", indexRouter);
        app.use("/dist", express.static(path.resolve(`${__dirname}/../dist`)));
        app.use("/static", express.static(path.resolve(`${__dirname}/../static`)));
    }

    private initializeWebsocket(io: SocketIO.Server) {
        io.on("connection", (socket) => {
            let player: Player;

            function checkAuth(callback: (data: AuthedMessage) => void): (data: AuthedMessage) => void {
                return (data: AuthedMessage) => {
                    if (player && player.token !== data.token) {
                        socket.emit("error", { message: "Failed auth"});
                    } else {
                        callback(data);
                    }
                };
            }

            function updateStatus(status: UserStatus) {
                if (!player) {
                    console.warn("player disconnected, no updateStatu possible");
                    return;
                }
                Object.keys(connectedPlayers).forEach((id) => {
                    const connectedPlayer = knownPlayers[id];

                    if (connectedPlayer.friendsInApp.some((friend) => friend === player.user.id )) {
                        const data: { [id: string]: UserStatus } = {};
                        data[player.user.id] = status;
                        connectedPlayers[id].emit("onlineStatus", data);
                    }
                });
            }

            socket.on("init", (data: InitializationMessage) => {
                player = {
                    user: data.me,
                    friends: data.friends,
                    friendsInApp: data.friendsInApp,
                    token: data.token,
                };
                console.log("recieved init", data.me);
                knownPlayers[player.user.id] = player;
                if (connectedPlayers[player.user.id]) {
                    connectedPlayers[player.user.id].disconnect(true);
                }
                connectedPlayers[player.user.id] = socket;
                updateStatus({ online: true });
                const statuses: { [id: string]: UserStatus } = {};
                player.friendsInApp.forEach((friend) => {
                    const friendPlayer = knownPlayers[friend];
                    if (friendPlayer) {
                        const status = {
                            online: friend in connectedPlayers,
                        } as UserStatus;
                        const game = findGameForUser(friend);
                        if (game) {
                            status.playing = game.playerA.player.user.id === friend ? game.playerB.player.user : game.playerA.player.user;
                        }
                        statuses[friend] = status;
                    }
                });
                socket.emit("onlineStatus", statuses);
                const game = findGameForUser(player.user.id);
                if (game) {
                    socket.emit("gameUpdate", gameLogic.clientGameFor(game, player));
                }
            });

            socket.on("start", checkAuth((data: GameStartMessage) => {
                const withPlayer = knownPlayers[data.with];
                if (withPlayer) {
                    console.log("recieved start", data, withPlayer.user);
                    // TODO: Check that user isn't already in game
                    if (withPlayer) {
                        const game = gameLogic.newGame(player, withPlayer);
                        if (game.guessableFriends.length >= 16) {
                            game.guessableFriends = shuffle(game.guessableFriends).slice(0, 16);
                        } else {
                            game.guessableFriends = game.guessableFriends.concat(shuffle(fakeFriends).slice(0, 16 - game.guessableFriends.length));
                        }
                        activeGames.push(game);
                        gamesByPlayer[withPlayer.user.id] = game;
                        gamesByPlayer[player.user.id] = game;

                        socket.emit("gameUpdate", gameLogic.gameForA(game));
                        connectedPlayers[withPlayer.user.id].emit("gameUpdate", gameLogic.gameForB(game));
                        updateStatus({ online: true, playing: withPlayer.user });
                    }
                }
            }));

            function actionRequested(action: ClientActionResponse) {
                const game = findGameForUser(player.user.id);
                if (game !== undefined) {
                    const type = action.type;
                    if (game.state.player === "both" || game.state.player!.player === player) {
                        if (game.state.type === type) {
                            return true;
                        }
                    }
                }
                return false;
            }

            function requestAction(action: ClientActionRequest, whoFor: GamePlayer | "both") {
                const newGameState: GameState = {
                    type: action,
                    player: whoFor,
                };
                if (whoFor === "both") {
                    const game = findGameForUser(player.user.id);
                    findGameForUser(game.playerA.player.user.id).state = newGameState;
                    findGameForUser(game.playerB.player.user.id).state = newGameState;
                    connectedPlayers[game.playerA.player.user.id].emit("clientRequest", action);
                    connectedPlayers[game.playerB.player.user.id].emit("clientRequest", action);
                } else {
                    findGameForUser((whoFor as GamePlayer).player!.user.id).state = newGameState;
                    connectedPlayers[(whoFor as GamePlayer).player!.user.id].emit("clientRequest", action);
                }
            }

            function findGamePlayer() {
                const myGame = findGameForUser(player.user.id);
                if (myGame.playerA.player.user.id === player.user.id) {
                    return myGame.playerA;
                }
                return myGame.playerB;
            }

            function findOpponent() {
                const myGame = findGameForUser(player.user.id);
                if (myGame.playerA.player.user.id === player.user.id) {
                    return myGame.playerB;
                }
                return myGame.playerA;
            }

            socket.on("action", checkAuth((data: ClientActionResponse) => {
                console.log("received action", data);
                if (actionRequested(data)) {
                    switch (data.type) {
                    case "Question":
                        break;
                    case "YesNo":
                        requestAction({
                            type: "ChoosePerson",
                            message: "Guess a person",
                        }, findGamePlayer());
                        break;
                    case "ChooseTurnType":
                        switch (data.response) {
                        case TurnType.Guess:
                            requestAction({
                                type: "ChoosePerson",
                                message: "Guess a person",
                            }, findGamePlayer());
                            break;
                        case TurnType.Question:
                            requestAction({
                                type: "Question",
                                message: "Ask a yes or no question",
                            }, findGamePlayer());
                            break;
                        }
                        break;
                    case "ChoosePerson":
                        break;
                    }
                }
            }));

            function logout() {
                updateStatus({ online: false });
                if (player) {
                    delete connectedPlayers[player.user.id];
                }
            }

            socket.on("disconnect", () => {
                console.log("disconnect", player ? player.user : undefined);
                logout();
            });

            socket.on("logout", () => {
                console.log("logout", player ? player.user : undefined);
                logout();
            });
        });
    }

    public run() {
        const server = this.app.listen(this.port);
        const io = socketIO(server);

        this.initializeWebsocket(io);

        console.info(`listening on ${this.port}`);
    }
}
