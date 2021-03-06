import * as React from "react";
import autobind = require("autobind-decorator");

import ClientActionComponent from "./base";


export default class ChooseTurn extends ClientActionComponent {
    @autobind
    private chooseType(type: TurnType) {
        return (ev: React.MouseEvent) => {
            this.sendResponse({
                token: this.props.token,
                type: "ChooseTurnType",
                response: type,
            } as ClientChooseTurnTypeResponse);
        };
    }

    render() {
        return (
            <div>
                {this.props.message ? <p className="message">{this.props.message}</p> : null}
                <p className="button-row">
                    <button onClick={this.chooseType(TurnType.Question)}>Question?</button>
                    <button onClick={this.chooseType(TurnType.Guess)}>Guess?</button>
                </p>
            </div>
        );
    }
}
