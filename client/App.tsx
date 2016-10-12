import * as React from "react";
import * as FB from "FB";
import * as io from "socket.io-client";
import autobind = require("autobind-decorator");

import "./base.css";

import Login from "./components/Login";
import Logout from "./components/Logout";
import Landing from "./components/Landing";
import Game from "./components/Game";

(window as any).React = React;


interface AppProps {}

interface AppState {
    loading?: boolean;
    gettingFriends?: boolean;
    user?: UserInfo;
    friendsInApp?: UserInfo[];
    friends?: UserInfo[];
    token?: string;
    onlineStatus?: { [player: string]: UserStatus };
    activeGame?: ClientGame;
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

        this.checkLogin();
    }

    componentDidMount() {
        this.socket.on("onlineStatus", (data: { [player: string]: UserStatus }) => {
            this.setState({
                onlineStatus: Object.assign(this.state.onlineStatus, data),
            });
        });

        this.socket.on("gameUpdate", (data: ClientGame) => {
            this.setState({ activeGame: data });
        });
    }

    componentWillUnmount() {
        this.socket.off("onlineStatus");
        this.socket.off("gameUpdate");
        this.socket.off("connect");
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
        this.setState({ token: response.accessToken });
        FB.api("/me", (response) => {
            if (response.error) this.handleFBError(response.error);
            this.setState({ user: response as UserInfo });

            FB.api(`${this.state.user!.id}/friends`, (response) => {
                if (response.error) this.handleFBError(response.error);
                this.setState({ friendsInApp: response.data as UserInfo[] });
                this.setState({ gettingFriends: true });
                FB.api(`/${this.state.user!.id}/taggable_friends`, {
                    fields: "name,picture.width(400).height(400)",
                }, this.collectFriends);
            });
        });
    }

    @autobind
    handleLoggedOut() {
        this.setState({
            user: undefined,
            token: undefined,
        });
        this.socket.emit("logout");
    }

    @autobind
    setUpWith(friend: UserInfo) {
        if (!this.state.gettingFriends) {
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
        if (this.state.loading) {
            if (this.state.user) {
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
                return <Login onLoggedIn={this.handleAuth} />;
            }
        } else {
            return <p>Loading...</p>;
        }
    }
}
