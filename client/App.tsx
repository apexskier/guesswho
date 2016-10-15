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

        if (FB !== null) {
            this.checkLogin();
        }
    }

    componentDidMount() {
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
    }

    @autobind
    collectFriends(response: any) {
        if (response.error) this.handleFBError(response.error);
        this.setState({
            friends: (this.state.friends || []).concat(response.data as UserInfo[])
        });
        if (response.paging.next) {
            fetch(response.paging.next, {
                method: "get",
            })
            .then((response: any) => response.json())
            .then(this.collectFriends);
        } else {
            this.initServerConnection();
            this.setState({ gettingFriends: false });
            this.socket.on("connect", this.initServerConnection);
        }
    }

    @autobind
    handleAuth(response: AuthResponse) {
        ga("send", "event", {
            eventCategory: "auth",
            eventAction: "authed",
        });
        this.setState({ token: response.accessToken });
        const userInfo = {
            fields: "name,email,picture.width(400).height(400)",
        };
        FB.api("/me", userInfo, (response) => {
            if (response.error) this.handleFBError(response.error);
            const r: UserInfo = response;
            this.setState({ user: r });
            Bugsnag.user = {
                id: r.id,
                name: r.name,
                email: r.email,
            };

            // TODO use promises to make more async
            FB.api(`${this.state.user!.id}/friends`, userInfo, (response) => {
                if (response.error) this.handleFBError(response.error);
                this.setState({ friendsInApp: response.data as UserInfo[] });
                this.setState({ gettingFriends: true });
                FB.api(`/${this.state.user!.id}/taggable_friends`, userInfo, this.collectFriends);
            });
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
                eventValue: friend.id,
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
            if (this.state.user) {
                if (this.state.activeGame) {
                    Bugsnag.context = "Landing";
                    ga("send", "screenview", {screenName: "Landing"});
                } else {
                    Bugsnag.context = "Game";
                    ga("send", "screenview", {screenName: "Game"});
                }
                return (
                    <div>
                        <div className="user-controls">
                            <Logout onLoggedOut={this.handleLoggedOut} />
                            {this.state.user && <p>{this.state.user.name}</p>}
                        </div>
                        <h1>Guess Who‽</h1>
                        {this.state.gettingFriends && <p>Finding your friends...</p>}
                        {this.state.activeGame
                            ? (
                                <Game
                                    token={this.state.token!}
                                    game={this.state.activeGame}
                                    socket={this.socket}
                                />
                            )
                            : (
                                <div>
                                    {this.state.friendsInApp ? (
                                        <Landing
                                            friends={this.state.friendsInApp}
                                            friendsOnline={this.state.onlineStatus!}
                                            setUpGame={this.setUpWith}
                                        />
                                    ) : null}
                                </div>
                            )}
                    </div>
                );
            } else {
                Bugsnag.context = "Login";
                ga("send", "screenview", {screenName: "Login"});
                return <Login onLoggedIn={this.handleAuth} />;
            }
        } else {
            Bugsnag.context = "Loading";
            ga("send", "screenview", {screenName: "Loading"});
            return <p>Loading...</p>;
        }
    }
}
