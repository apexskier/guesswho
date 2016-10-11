import * as React from "react";
import autobind = require("autobind-decorator");

import ClientActionComponent from "./base";


export default class ChooseTurn extends ClientActionComponent {
    @autobind
    private complete(ev: React.MouseEvent) {
        this.sendResponse({
            token: this.props.token,
            type: "Complete",
            response: this.props.message,
        } as ClientCompleteResponse);
    }

    render() {
        return (
            <div>
                {this.props.message ? <p>{this.props.message}</p> : null}
                <p>
                    <button onClick={this.complete}>I'm done</button>
                </p>
            </div>
        );
    }
}
