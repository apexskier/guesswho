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

function findGameForUser(id: userID) {
    return gamesByPlayer[id as string];
}

function pushGameUpdate(game: ServerGame) {
    Object.keys(game.players).forEach((id) => {
        const gamePlayer = game.players[id];
        const clientGame: ClientGame = {
            opponent: Object.keys(game.players).filter((id_) => id_ !== id).map((id) => game.players[id].player.user)[0],
            chosenFriend: gamePlayer.chosenFriend,
            eliminatedFriends: gamePlayer.eliminatedFriends,
            guessableFriends: game.guessableFriends,
            status: gamePlayer.status,
        };
        connectedPlayers[id].emit("gameUpdate", clientGame);
    });
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
            let player: Player | null = null;

            function checkAuth(callback: (data: AuthedMessage) => void): (data: AuthedMessage) => void {
                return (data: AuthedMessage) => {
                    if (!player || player.token !== data.token) {
                        socket.emit("error", { message: "Failed auth"});
                    } else {
                        callback(data);
                    }
                };
            }

            function updateStatusForUser(status: UserStatus, user: userID) {
                Object.keys(connectedPlayers).forEach((id) => {
                    const connectedPlayer = knownPlayers[id];

                    console.log(`testing onlinestatus for ${knownPlayers[id].user.name}`);
                    if (connectedPlayer.friendsInApp.some((friend) => friend === user)) {
                        const data: { [id: string]: UserStatus } = {};
                        data[user] = status;
                        connectedPlayers[id].emit("onlineStatus", data);
                        console.log(`emitting onlinestatus to ${knownPlayers[id].user.name}`, data);
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
                const statuses: { [id: string]: UserStatus } = {};
                player.friendsInApp.forEach((friend) => {
                    const friendPlayer = knownPlayers[friend];
                    if (friendPlayer) {
                        const status = {
                            online: friend in connectedPlayers,
                        } as UserStatus;
                        const game = findGameForUser(friend);
                        if (game) {
                            status.playing = knownPlayers[friend].user;
                        }
                        statuses[friend] = status;
                    }
                });
                updateStatusForUser({ online: true }, player.user.id);
                socket.emit("onlineStatus", statuses);
                const game = findGameForUser(player.user.id);
                if (game) {
                    socket.emit("gameUpdate", gameLogic.clientGameFor(game, player));
                }
            });

            socket.on("start", checkAuth((data: GameStartMessage) => {
                const withPlayer = knownPlayers[data.with];
                if (withPlayer && player) {
                    console.log("recieved start", data, withPlayer.user);
                    // TODO: Check that user isn't already in game
                    if (withPlayer) {
                        const game = gameLogic.newGame(player, withPlayer);
                        shuffle(game.guessableFriends);
                        if (game.guessableFriends.length >= 16) {
                            game.guessableFriends = game.guessableFriends.slice(0, 16);
                        } else {
                            game.guessableFriends = game.guessableFriends.concat(shuffle(fakeFriends).slice(0, 16 - game.guessableFriends.length));
                        }

                        activeGames.push(game);
                        gamesByPlayer[withPlayer.user.id] = game;
                        gamesByPlayer[player.user.id] = game;
                        updateStatusForUser({ online: true, playing: withPlayer.user }, player.user.id);
                        updateStatusForUser({ online: withPlayer.user.id in connectedPlayers, playing: player.user }, withPlayer.user.id);

                        pushGameUpdate(game);
                    }
                }
            }));

            function findGamePlayer(): GamePlayer | null {
                if (player) {
                    const myGame = findGameForUser(player.user.id);
                    if (myGame) {
                        return myGame.players[player.user.id];
                    }
                }
                return null;
            }

            function findOpponent(): GamePlayer | null {
                if (player) {
                    const myGame = findGameForUser(player.user.id);
                    if (myGame) {
                        const opponentId = Object.keys(myGame.players).find((id) => id !== player!.user.id as string);
                        return myGame.players[opponentId];
                    }
                }
                return null;
            }

            function actionRequested(action: ClientResponse) {
                if (player) {
                    const game = findGameForUser(player.user.id);
                    if (game !== undefined) {
                        const status = game.players[player.user.id].status;
                        if (status !== "winner") {
                            const type = (status as ClientActionRequest).type;
                            if (type === action.type) {
                                return true;
                            }
                        }
                    }
                }
                return false;
            }

            function requestAction(action: ClientActionRequest, whoFor: "current" | "opponent") {
                if (player) {
                    const game = findGameForUser(player.user.id);
                    if (game) {
                        const playerId = Object.keys(game.players).find((k) => {
                            if (whoFor === "current") {
                                return k === player!.user.id;
                            } else {
                                return k !== player!.user.id;
                            }
                        });
                        const gamePlayer = game.players[playerId];
                        gamePlayer.status = action;
                        connectedPlayers[playerId].emit("gameUpdate", gameLogic.clientGameFor(game, gamePlayer.player));
                        console.log(`requested action from ${knownPlayers[playerId].user.name}`, action);
                    }
                }
            }

            socket.on("action", checkAuth((data: ClientResponse) => {
                const p = player!;
                console.log(`received action from ${p.user.name}`, data);
                if (actionRequested(data)) {
                    switch (data.type) {
                    case "Question":
                        requestAction({
                            type: "YesNo",
                            message: data.response,
                        }, "opponent");
                        return;
                    case "YesNo":
                        requestAction({
                            type: "Eliminate",
                            message: `${p.user.name} said ${data.response ? "Yes" : "No"}`,
                        }, "opponent");
                        return;
                    case "ChooseTurnType":
                        switch (data.response) {
                        case TurnType.Guess:
                            requestAction({
                                type: "Guess",
                                message: "Guess a person",
                            }, "current");
                            return;
                        case TurnType.Question:
                            requestAction({
                                type: "Question",
                                message: "Ask a yes or no question",
                            }, "current");
                            return;
                        }
                        break;
                    case "Guess":
                        {
                            const game = findGameForUser(p.user.id);
                            const opponentsFriend = game.players[Object.keys(game.players).find((k) => k !== p.user.id)].chosenFriend;
                            console.log("guess", opponentsFriend, data.response);
                            if (opponentsFriend !== null) {
                                if (opponentsFriend !== data.response) {
                                    console.log(game.players[p.user.id].eliminatedFriends);
                                    game.players[p.user.id].eliminatedFriends.push(data.response);
                                    console.log(game.players[p.user.id].eliminatedFriends);
                                    requestAction({
                                        type: "Wait",
                                        message: "Nope, they didn't choose them.",
                                    }, "current");
                                    requestAction({
                                        type: "ChooseTurnType",
                                        message: "What do you want to do?",
                                    }, "opponent");
                                } else {
                                    game.players[p.user.id].status = "winner";
                                    requestAction({
                                        type: "Cleanup",
                                        message: `${p.user.name} won!`,
                                    }, "current");
                                    requestAction({
                                        type: "Cleanup",
                                        message: `${p.user.name} won!`,
                                    }, "opponent");
                                }
                                return;
                            } else {
                                console.warn("impossible state");
                            }
                        }
                        break;
                    case "Eliminate":
                        {
                            const game = findGameForUser(p.user.id);
                            const gamePlayer = game.players[p.user.id];
                            const eliminatedUsers = (data.response as userID[]) || [];
                            eliminatedUsers.forEach((id) => {
                                if (!gamePlayer.eliminatedFriends.some((eid) => id === eid) &&
                                    game.guessableFriends.some((f) => f.id === id)) {
                                    gamePlayer.eliminatedFriends.push(id);
                                }
                            })
                            requestAction({
                                type: "ChooseTurnType",
                                message: "What do you want to do?",
                            }, "opponent");
                            requestAction({
                                type: "Wait",
                                message: `Waiting on ${(<GamePlayer>findOpponent()).player.user.name}`,
                            }, "current");
                            return;
                        }
                    case "ChoosePerson":
                        {
                            const game = findGameForUser(p.user.id);
                            const gamePlayer = game.players[p.user.id];
                            if (gamePlayer.chosenFriend === null) {
                                gamePlayer.chosenFriend = game.guessableFriends.find((f) => f.id === data.response).id;
                                if (Object.keys(game.players).map((k) => game.players[k]).every((p) => p.chosenFriend !== null)) {
                                    requestAction({
                                        type: "ChooseTurnType",
                                        message: "What do you want to do?",
                                    }, "opponent");
                                    requestAction({
                                        type: "Wait",
                                        message: `Waiting on ${(<GamePlayer>findOpponent()).player.user.name}`,
                                    }, "current");
                                    return;
                                } else {
                                    // not every user has chosen a friend yet
                                    requestAction({
                                        type: "Wait",
                                        message: `Waiting on ${(<GamePlayer>findOpponent()).player.user.name}`,
                                    }, "current");
                                    return;
                                }
                            } else {
                                requestAction({
                                    type: "Wait",
                                    message: `??? You can't choose again!`,
                                }, "current");
                                return;
                            }
                        }
                    case "Complete":
                        requestAction({
                            type: "ChooseTurnType",
                            message: "What do you want to do?",
                        }, "opponent");
                        requestAction({
                            type: "Wait",
                            message: `Waiting on ${(<GamePlayer>findOpponent()).player.user.name}`,
                        }, "current");
                        return;
                    case "Cleanup":
                        const game = findGameForUser(p.user.id);
                        const idx = activeGames.map((game) => game.id).indexOf(game.id);
                        activeGames.splice(idx, 0);
                        Object.keys(game.players).forEach((id) => {
                            delete gamesByPlayer[id];
                            connectedPlayers[id].emit("gameUpdate", null);
                            console.log(`ended game for ${knownPlayers[id].user.name}`);
                            updateStatusForUser({ online: true }, id);
                        });
                    }
                }
                const game = findGameForUser(p.user.id);
                if (game) {
                    connectedPlayers[p.user.id].emit("gameUpdate", gameLogic.clientGameFor(game, p));
                    console.log(`resent action to ${p.user.name}`);
                }
            }));

            function logout() {
                if (player) {
                    console.log(player);
                    updateStatusForUser({ online: false }, player.user.id);
                    delete connectedPlayers[player.user.id];
                    player = null;
                }
            }

            socket.on("disconnect", () => {
                console.log("disconnect", player);
                logout();
            });

            socket.on("logout", () => {
                console.log("logout", player);
                logout();
            });

            socket.on("error", (err: any) => {
                console.error(err);
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
