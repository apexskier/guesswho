import * as React from "react";
import * as FB from "FB";
import autobind = require("autobind-decorator");

import Turn from "./Game/Turn";


interface GameProps {
    game: ClientGame;
    socket: SocketIOClient.Socket;
}

interface GameState {
    turnType?: TurnType;
}

export default class Game extends React.Component<GameProps, GameState> {
    constructor(props: GameProps) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        const socket = this.props.socket;
    }

    componentWillUnmount() {
        const socket = this.props.socket;
    }

    @autobind
    private onChooseTurnType(type: TurnType) {
        this.setState({ turnType: type });
    }

    render() {
        return (
            <div>
                {this.props.game.yourTurn ? (
                    <Turn
                        socket={this.props.socket}
                        turnType={this.state.turnType}
                        onChooseTurnType={this.onChooseTurnType}
                    />
                ) : <p>Not your turn</p>}
                <ul>
                    {this.props.game.guessableFriends.map((friend) => <li key={friend.id}><img src={friend.picture.data.url} alt={friend.name} /></li>)}
                </ul>
            </div>
        );
    }
}
