import * as React from "react";
import * as FB from "FB";
import autobind = require("autobind-decorator");

import Question from "./Game/ClientAction/Question";
import ChooseTurn from "./Game/ClientAction/ChooseTurn";
import YesNo from "./Game/ClientAction/YesNo";


interface GameProps {
    game: ClientGame;
    socket: SocketIOClient.Socket;
    token: string;
}

interface GameState {
    pendingActionRequest?: ClientActionRequest;
    pendingServer?: boolean;
}

export default class Game extends React.Component<GameProps, GameState> {
    constructor(props: GameProps) {
        super(props);
        this.state = {
            pendingServer: false,
        };
    }

    componentDidMount() {
        const socket = this.props.socket;
        socket.on("clientRequest", (request: ClientActionRequest) => {
            this.setState({ pendingActionRequest: request });
        });
    }

    componentWillUnmount() {
        const socket = this.props.socket;
        socket.off("clientRequest");
    }

    componentWillReceiveProps(newProps: GameProps) {
    }

    @autobind
    private onFriendClick(friend: UserInfo) {
        return (ev: React.MouseEvent) => {
            if (this.state.pendingActionRequest && this.state.pendingActionRequest.type === "ChoosePerson") {
                this.props.socket.emit("action", {
                    token: this.props.token,
                    type: "ChoosePerson",
                    response: friend.id,
                } as ClientChoosePersonResponse);
                this.setState({ pendingActionRequest: undefined });
            }
        };
    }

    render() {
        let actionUI: JSX.Element | null = null;
        if (this.state.pendingActionRequest) {
            switch (this.state.pendingActionRequest.type) {
            case "ChoosePerson":
                actionUI = <p>{ this.state.pendingActionRequest.message ? this.state.pendingActionRequest.message : "Choose a friend."}</p>;
                break;
            case "Question":
                actionUI = (
                    <Question
                        socket={this.props.socket}
                        token={this.props.token}
                        message={this.state.pendingActionRequest.message}
                    />
                );
                break;
            case "YesNo":
                actionUI = (
                    <YesNo
                        socket={this.props.socket}
                        token={this.props.token}
                        message={this.state.pendingActionRequest.message}
                    />
                );
                break;
            case "ChooseTurnType":
                actionUI = (
                    <ChooseTurn
                        socket={this.props.socket}
                        token={this.props.token}
                        message={this.state.pendingActionRequest.message}
                    />
                );
                break;
            }
        }
        return (
            <div>
                {this.state.pendingServer ? <p>Waiting...</p> : null}
                {actionUI}
                <ul>
                    {this.props.game.guessableFriends.map((friend) => (
                        <li key={friend.id} onClick={this.onFriendClick(friend)}>
                            {friend.picture ?
                                <img src={friend.picture.data.url} alt={friend.name} /> :
                                friend.name}
                        </li>
                    ))}
                </ul>
            </div>
        );
    }
}
