import * as React from "react";
import * as FB from "FB";
import autobind = require("autobind-decorator");

import "./game.css";

import ga from "../../analytics";
import sendAction from "../sendAction";
import Tile from "./Tile";
import ChooseTurn from "./ClientAction/ChooseTurn";
import Complete from "./ClientAction/Complete";
import Question from "./ClientAction/Question";
import YesNo from "./ClientAction/YesNo";


interface GameProps {
    game: ClientGame;
    socket: SocketIOClient.Socket;
    token: string;
}

interface GameState {
    pendingActionRequest?: ClientActionRequest;
    pendingServer?: boolean;
    pendingEliminations?: userID[];
}

export default class Game extends React.Component<GameProps, GameState> {
    constructor(props: GameProps) {
        super(props);
        this.state = {
            pendingServer: false,
        };
        console.log(props.game);
    }

    componentWillReceiveProps(newProps: GameProps) {
        console.log(newProps.game);
        this.setState({ pendingServer: false });
        if (newProps.game) {
            this.setState({ pendingEliminations: undefined });
        }
    }

    @autobind
    private onFriendClick(friend: UserInfo) {
        return (ev: React.MouseEvent) => {
            if (this.props.game.status !== "winner") {
                const actionRequest = (this.props.game.status as ClientActionRequest);
                if (actionRequest.type === "ChoosePerson" || actionRequest.type === "Guess") {
                    sendAction(this.props.socket, {
                        token: this.props.token,
                        type: actionRequest.type,
                        response: friend.id,
                    } as ClientChoosePersonResponse);
                    ga("send", "event", "action", actionRequest.type, friend.id);
                    this.actionComplete();
                } else if (actionRequest.type === "Eliminate") {
                    let elims: userID[];
                    if (this.state.pendingEliminations) {
                        elims = (this.state.pendingEliminations as userID[]).slice(0);
                    } else {
                        elims = [];
                    }
                    const idx = elims.indexOf(friend.id);
                    if (idx > -1) {
                        elims.splice(idx, 1);
                    } else {
                        elims.push(friend.id);
                    }
                    this.setState({ pendingEliminations: elims });
                }
            }
        };
    }

    @autobind
    private actionComplete() {
        this.setState({ pendingServer: true });
    }

    @autobind
    private eliminate(ev: React.MouseEvent) {
        sendAction(this.props.socket, {
            token: this.props.token,
            type: "Eliminate",
            response: this.state.pendingEliminations || [],
        } as ClientResponse);
        this.actionComplete();
    }

    @autobind
    private complete(ev: React.MouseEvent) {
        sendAction(this.props.socket, {
            token: this.props.token,
            type: "Cleanup",
            response: "",
        } as ClientResponse);
        this.actionComplete();
    }

    @autobind
    private onScrubStart(ev: React.MouseEvent) {
        const el = (ev.currentTarget as HTMLElement);
        el.classList.add("active");
    }

    @autobind
    private onScrubEnd(ev: React.MouseEvent) {
        const el = (ev.currentTarget as HTMLElement);
        el.classList.remove("active");
        el.style.transform = null;
    }

    @autobind
    private onScrubMove(ev: React.MouseEvent) {
        const el = (ev.currentTarget as HTMLElement);
        const rect = el.getBoundingClientRect();
        const xDeg = (((ev.clientY - rect.top) / rect.height) - .5) * 20;
        const yDeg = (((ev.clientX - rect.left) / rect.width) - .5) * 20;
        el.style.transform = `translateZ(10px) rotateY(${-yDeg}deg) rotateX(${xDeg}deg)`;
    }

    render() {
        let actionUI: JSX.Element | null = null;
        if (this.props.game.status !== "winner") {
            const action = this.props.game.status as ClientActionRequest;
            switch (action.type) {
            case "Wait":
                actionUI = <p className="message">{action.message ? action.message : "Please wait."}</p>;
                break;
            case "ChoosePerson":
                actionUI = <p className="message">{action.message ? action.message : "Choose a friend."}</p>;
                break;
            case "Guess":
                actionUI = <p className="message">{action.message ? action.message : "Guess a friend."}</p>;
                break;
            case "Cleanup":
                actionUI = (
                    <div>
                        {action.message && <p className="message">{action.message}</p>}
                        <p className="button-row">
                            <button onClick={this.complete}>Cleanup</button>
                        </p>
                    </div>
                );
                break;
            case "Question":
                actionUI = (
                    <Question
                        socket={this.props.socket}
                        token={this.props.token}
                        message={action.message}
                        onComplete={this.actionComplete}
                    />
                );
                break;
            case "YesNo":
                actionUI = (
                    <YesNo
                        socket={this.props.socket}
                        token={this.props.token}
                        message={action.message}
                        onComplete={this.actionComplete}
                    />
                );
                break;
            case "ChooseTurnType":
                actionUI = (
                    <ChooseTurn
                        socket={this.props.socket}
                        token={this.props.token}
                        message={action.message}
                        onComplete={this.actionComplete}
                    />
                );
                break;
            case "Complete":
                actionUI = (
                    <Complete
                        socket={this.props.socket}
                        token={this.props.token}
                        message={action.message}
                        onComplete={this.actionComplete}
                    />
                );
                break;
            case "Eliminate":
                actionUI = (
                    <div>
                        <p className="message">{action.message ? action.message : "Eliminate friends."}</p>
                        <p className="button-row">
                            <button onClick={this.eliminate}>Done</button>
                        </p>
                    </div>
                );
                break;
            }
        }
        return (
            <div className="game">
                <p>
                    Playing with {this.props.game.opponent.name}
                    {this.props.game.opponent.picture !== undefined &&
                        !this.props.game.opponent.picture.data.is_silhouette &&
                        <img className="opponent" src={this.props.game.opponent.picture.data.url} />}
                </p>
                {this.state.pendingServer ? <p>Waiting...</p> : (
                    <div className="action">{actionUI}</div>
                )}
                <div className="game-board">
                    {this.props.game.guessableFriends.map((friend) => (
                        <Tile
                            key={friend.id}
                            friend={friend}
                            chosen={this.props.game.chosenFriend !== null && friend.id === this.props.game.chosenFriend}
                            pendingElimination={this.state.pendingEliminations !== undefined && (this.state.pendingEliminations as userID[]).some((id) => friend.id === id)}
                            eliminated={this.props.game.eliminatedFriends.some((id) => friend.id === id)}
                            onClick={this.onFriendClick(friend)}
                        />
                    ))}
                </div>
            </div>
        );
    }
}
