import * as React from "react";
import * as io from "socket.io-client";
import autobind = require("autobind-decorator");

import "./base.css";

import Bugsnag from "./bugsnag";
import ga from "./analytics";
import FB from "./facebook";
import Login from "./components/Login";
import Logout from "./components/Logout";
import Landing from "./components/Landing";
import Game from "./components/Game";

(window as any).React = React;

const userInfo = {
    fields: "name,email,picture.width(400).height(400)",
};

interface AppProps {
    fatalError?: FatalError;
}

interface AppState {
    loading?: boolean;
    gettingFriends?: boolean;
    user?: UserInfo;
    friendsInApp?: UserInfo[];
    friends?: UserInfo[];
    token?: string;
    onlineStatus?: { [player: string]: UserStatus };
    activeGame?: ClientGame | null;
    fatalError?: FatalError;
}

export default class App extends React.Component<AppProps, AppState> {
    private socket = io(location.origin, {
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 5000,
    });

    constructor(props: AppProps) {
        super(props);

        this.state = {
            loading: true,
            onlineStatus: {},
        };
    }

    componentDidMount() {
        this.checkLogin();

        this.socket.on("onlineStatus", (data: { [player: string]: UserStatus }) => {
            this.setState({
                onlineStatus: Object.assign(this.state.onlineStatus, data),
            });
        });

        this.socket.on("gameUpdate", (data: ClientGame) => {
            this.setState({ activeGame: data });
            Bugsnag.refresh();
        });

        this.socket.on("disconnect", () => {
            this.setState({ activeGame: null });
        });
    }

    componentWillUnmount() {
        this.socket.off("onlineStatus");
        this.socket.off("gameUpdate");
        this.socket.off("connect");
        this.socket.off("disconnect");
    }

    checkLogin() {
        FB.getLoginStatus(response => {
            if (response.status === "connected") {
                this.handleAuth(response.authResponse!);
            } else {
                this.setState({ loading: false });
            }
        });
    }

    handleFBError(error: FBError) {
        if (error.type === "OAuthException" && error.code === 463 || error.code === 467) {
            ga("send", "event", {
                eventCategory: "auth",
                eventAction: "OAuthException",
                eventValue: error,
            });
            this.handleLoggedOut();
        }
        this.setState({ loading: false });
        console.error(error);
    }

    @autobind
    initServerConnection() {
        this.socket.emit("init", {
            token: this.state.token,
            me: this.state.user,
            friends: this.state.friends,
            friendsInApp: this.state.friendsInApp ? this.state.friendsInApp.map((f) => f.id) : undefined,
        } as InitializationMessage);
        this.socket.on("connect", this.initServerConnection);
    }

    @autobind
    collectFriends(response: any): Promise<{}> {
        return new Promise((resolve, reject) => {
            if (response.error) {
                reject({
                    type: "facebook",
                    error: response.error,
                });
                return;
            } else {
                this.setState({
                    friends: (this.state.friends || []).concat(response.data as UserInfo[])
                });
                if (response.paging.next) {
                    resolve(fetch(response.paging.next, {
                        method: "get",
                    })
                    .then((response: any) => response.json())
                    .then(this.collectFriends));
                } else {
                    resolve();
                }
            }
        });
    }

    @autobind
    handleAuth(response: AuthResponse) {
        ga("send", "event", {
            eventCategory: "auth",
            eventAction: "authed",
        });
        this.setState({ token: response.accessToken });
        FB.api("/me", userInfo, (response) => {
            if (response.error) this.handleFBError(response.error);
            const r: UserInfo = response;
            this.setState({ user: r, loading: false });
            Bugsnag.user = {
                id: r.id,
                name: r.name,
                email: r.email,
            };

            this.refreshAllFriends().then((res) => {
                this.initServerConnection();
            }).catch((err) => {
                if ((err.type && err.type === "facebook")) {
                    this.handleFBError(err.error);
                }
            });
        });
    }

    @autobind
    refreshAllFriends(): Promise<{}> {
        return Promise.all([ this.refreshPlayableFriends(), this.refreshTaggableFriends() ]);
    }

    refreshPlayableFriends(): Promise<{}> {
        return new Promise((resolve, reject) => {
            if (this.state.user) {
                // TODO use promises to make more async
                FB.api(`${this.state.user!.id}/friends`, this.state.user, (response) => {
                    if (response.error) {
                        reject({
                            type: "facebook",
                            error: response.error,
                        });
                    } else {
                        this.setState({ friendsInApp: response.data as UserInfo[] });
                        resolve();
                    }
                });
            } else {
                reject("user not found");
            }
        });
    }

    refreshTaggableFriends(): Promise<{}> {
        return new Promise((resolve, reject) => {
            if (this.state.user) {
                this.setState({ gettingFriends: true });
                FB.api(`/${this.state.user!.id}/taggable_friends`, userInfo, (response) => {
                    resolve(this.collectFriends(response));
                });
            } else {
                reject("user not found");
            }
        }).then((res) => {
            this.setState({ gettingFriends: false });
            return res;
        }, (err) => {
            this.setState({ gettingFriends: false });
            throw err;
        });
    }

    @autobind
    handleLoggedOut() {
        ga("send", "event", {
            eventCategory: "auth",
            eventAction: "logout",
        });
        this.setState({
            user: undefined,
            token: undefined,
        });
        this.socket.emit("logout");
    }

    @autobind
    setUpWith(friend: UserInfo) {
        if (!this.state.gettingFriends) {
            ga("send", "event", {
                eventCategory: "game",
                eventAction: "start",
            });
            return () => {
                this.socket.emit("start", {
                    token: this.state.token,
                    with: friend.id,
                } as GameStartMessage);
            };
        }
        return () => {};
    }

    render() {
        if (this.state.fatalError || this.props.fatalError) {
            const fatalError = this.state.fatalError || this.props.fatalError;
            return (
                <div>
                    <h2>{fatalError!.title}</h2>
                    <p>{fatalError!.message}</p>
                </div>
            );
        } else if (this.state.loading) {
            Bugsnag.context = "Loading";
            ga("send", "screenview", {screenName: "Loading"});
            return <p>Loading...</p>;
        } else {
            if (this.state.user) {
                if (this.state.activeGame) {
                    Bugsnag.context = "Landing";
                    ga("send", "screenview", {screenName: "Landing"});
                } else {
                    Bugsnag.context = "Game";
                    ga("send", "screenview", {screenName: "Game"});
                }
                return (
                    <div className="authed-app">
                        <div className="user-controls">
                            <button
                                className="refresh-button"
                                onClick={this.refreshAllFriends}
                                disabled={!!(this.state.gettingFriends || this.state.activeGame)}
                            >Reimport</button>
                            <Logout onLoggedOut={this.handleLoggedOut} />
                            {this.state.user && <p>{this.state.user.name}</p>}
                        </div>
                        <h1>Guess Who‽</h1>
                        {this.state.activeGame
                            ? (
                                <Game
                                    token={this.state.token!}
                                    game={this.state.activeGame}
                                    socket={this.socket}
                                />
                            ) : (
                                this.state.friendsInApp ? (
                                    <Landing
                                        friends={this.state.friendsInApp}
                                        friendsOnline={this.state.onlineStatus!}
                                        setUpGame={this.setUpWith}
                                    />
                                ) : null)}
                    </div>
                );
            } else {
                Bugsnag.context = "Login";
                ga("send", "screenview", {screenName: "Login"});
                return <Login onLoggedIn={this.handleAuth} />;
            }
        }
    }
}
