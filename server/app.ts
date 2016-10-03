import * as path from "path";
import * as express from "express";
import * as socketIO from "socket.io";

import requestLogger from "./middleware/requestLogger";
import * as gameLogic from "./gameLogic";


const knownPlayers: { [id: string]: Player } = {};
const connectedPlayers: { [id: string]: SocketIO.Socket } = {};
const activeGames: ServerGame[] = [];

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
    }

    private initializeWebsocket(io: SocketIO.Server) {
        io.on("connection", (socket) => {
            let player: Player;
            let onlineStatusInterval: NodeJS.Timer;

            function checkAuth(callback: (data: AuthedMessage) => void): (data: AuthedMessage) => void {
                return (data: AuthedMessage) => {
                    if (player && player.token !== data.token) {
                        socket.emit("error", { message: "Failed auth"});
                    } else {
                        callback(data);
                    }
                };
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

                onlineStatusInterval = setInterval(() => {
                    const statuses: { [player: string]: UserStatus } = {};
                    player.friendsInApp.forEach((friend) => {
                        const game = activeGames.find((g) => {
                            return g.playerA.player.user.id === friend || g.playerB.player.user.id === friend;
                        });
                        statuses[friend] = {
                            online: friend in connectedPlayers,
                        };
                        if (game) {
                            statuses[friend].playing = game.playerA.player.user.id === friend ? game.playerB.player.user : game.playerA.player.user;
                        }
                    });
                    socket.emit("online", statuses);
                }, 1000);
            });

            socket.on("start", checkAuth((data: GameStartMessage) => {
                const withPlayer = knownPlayers[data.with];
                if (withPlayer) {
                    console.log("recieved start", data, withPlayer.user);
                    if (withPlayer) {
                        const game = gameLogic.newGame(player, withPlayer);
                        activeGames.push(game);

                        socket.emit("gameStart", gameLogic.gameForA(game));
                        connectedPlayers[withPlayer.user.id].emit("gameStart", gameLogic.gameForB(game));
                    }
                }
            }));

            function logout() {
                if (player) {
                    clearInterval(onlineStatusInterval);
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
