import * as React from "react";
import * as FB from "FB";
import * as io from "socket.io-client";
import autobind = require("autobind-decorator");

import Login from "./components/Login";
import Logout from "./components/Logout";
import Landing from "./components/Landing";
import Game from "./components/Game";


interface AppProps {}

interface AppState {
    loading?: boolean;
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
            console.log(data);
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
            this.setState({ user: undefined });
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
    handleAuth(response: AuthResponse) {
        this.setState({ token: response.accessToken });
        FB.api("/me", (response) => {
            if (response.error) this.handleFBError(response.error);
            this.setState({ user: response as UserInfo });

            FB.api(`${this.state.user!.id}/friends`, (response) => {
                if (response.error) this.handleFBError(response.error);
                this.setState({ friendsInApp: response.data as UserInfo[] });

                FB.api(`/${this.state.user!.id}/taggable_friends`, (response) => {
                    if (response.error) this.handleFBError(response.error);
                    this.setState({
                        friends: response.data as UserInfo[]
                    });
                    this.initServerConnection();
                    this.socket.on("connect", this.initServerConnection);
                });
            });
        });
    }

    @autobind
    handleLoggedOut() {
        this.setState({
            user: undefined,
        });
        this.socket.emit("logout");
    }

    @autobind
    setUpWith(friend: UserInfo) {
        return () => {
            this.socket.emit("start", {
                token: this.state.token,
                with: friend.id,
            } /* as GameStartMessage */);
        };
    }

    render() {
        if (this.state.loading) {
            if (this.state.user) {
                return (
                    <div>
                        <Logout onLoggedOut={this.handleLoggedOut} />
                        <h1>Guess Who‽</h1>
                        {this.state.user ? <p>Logged in as: {this.state.user.name}</p> : null}
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
                                    {this.state.friends ? (
                                        <div>
                                            <h3>All friends</h3>
                                            {this.state.friends.length === 0
                                                ? <p>You have no friends?! 😱</p>
                                                : (
                                                    <ul>
                                                        {this.state.friends.map((friend) => (
                                                            <li key={friend.id}>
                                                                {friend.picture ?
                                                                    <img src={friend.picture.data.url} alt={friend.name} /> :
                                                                    <p>{friend.name}</p>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                        </div>
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
