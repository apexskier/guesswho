import * as React from "react";
import * as FB from "FB";
import autobind = require("autobind-decorator");

interface TurnProps {
    socket: SocketIOClient.Socket;
    onChooseTurnType: (type: TurnType) => void;
    turnType?: TurnType;
}

export default class Turn extends React.Component<TurnProps, {}> {
    @autobind
    chooseType(type: TurnType) {
        return (ev: React.MouseEvent) => {
            this.props.onChooseTurnType(type);
        };
    }

    render() {
        if (this.props.turnType) {
            switch (this.props.turnType) {
            case TurnType.Question:
                return (
                    <textarea placeholder="Ask a question"></textarea>
                );
            case TurnType.Guess:
                return (
                    <p>Guess a friend:</p>
                );
            }
        } else {
            return (
                <p>
                    <button onClick={this.chooseType(TurnType.Question)}>Question?</button>
                    {" or "}
                    <button onClick={this.chooseType(TurnType.Guess)}>Guess?</button>
                </p>
            );
        }
    }
}
