import * as React from "react";
import * as FB from "FB";
import * as io from "socket.io-client";
import autobind = require("autobind-decorator");

import Login from "./components/Login";
import Logout from "./components/Logout";
import FriendStatus from "./components/FriendStatus";


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
        this.socket.on("online", (data: { [player: string]: UserStatus }) => {
            console.log("online ping", data);
            this.setState({ onlineStatus: data });
        });
    }

    checkLogin() {
        FB.getLoginStatus(response => {
            if (response.status === "connected") {
                this.handleAuth(response.authResponse);
            }
        });
    }

    handleFBError(error: FBError) {
        if (error.type === "OAuthException" && error.code === 463 || error.code === 467) {
            this.setState({ user: null });
        }
        console.error(error);
    }

    @autobind
    initServerConnection() {
        this.socket.emit("init", {
            token: this.state.token,
            me: this.state.user,
            friends: this.state.friends,
            friendsInApp: this.state.friendsInApp.map((f) => f.id),
        } /* as InitializationMessage */);
    }

    @autobind
    handleAuth(response: AuthResponse) {
        this.setState({ token: response.accessToken });
        FB.api("/me", (response) => {
            if (response.error) this.handleFBError(response.error);
            this.setState({ user: response as UserInfo });

            FB.api(`${this.state.user.id}/friends`, (response) => {
                if (response.error) this.handleFBError(response.error);
                this.setState({ friendsInApp: response.data as UserInfo[] });

                FB.api(`/${this.state.user.id}/taggable_friends`, (response) => {
                    if (response.error) this.handleFBError(response.error);
                    this.setState({
                        friends: response.data as UserInfo[]
                    });
                    this.initServerConnection();
                    this.socket.on("connect", this.initServerConnection);

                    this.socket.on("gameStart", (data: ServerGame) => {
                        console.log(data);
                    });
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
                        {this.state.friendsInApp
                            ? (
                                <div>
                                    <h3>Friends to play with</h3>
                                    {this.state.friendsInApp.length === 0
                                        ? <p>You have no friends using this app 😢. Invite some!</p>
                                        : <ul>{this.state.friendsInApp.map(friend => (
                                            <FriendStatus
                                                key={friend.id}
                                                friend={friend}
                                                status={this.state.onlineStatus[friend.id]}
                                                onClick={this.setUpWith(friend)}
                                            />
                                        ))}</ul>}
                                </div>
                            ) : null}
                        {this.state.friends
                            ? (
                                <div>
                                    <h3>All friends</h3>
                                    {this.state.friends.length === 0
                                        ? <p>You have no friends?! 😱</p>
                                        : <ul>{this.state.friends.map(friend => <li key={friend.id}><img src={friend.picture.data.url} alt={friend.name} /></li>)}</ul>}
                                </div>
                            ) : null}
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
