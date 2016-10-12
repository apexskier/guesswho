import * as React from "react";
import autobind = require("autobind-decorator");

import ClientActionComponent from "./base";


export default class ChooseTurn extends ClientActionComponent {
    @autobind
    private respond(response: boolean) {
        return (ev: React.MouseEvent) => {
            this.sendResponse({
                token: this.props.token,
                type: "YesNo",
                response: response,
            });
        };
    }

    render() {
        return (
            <div>
                {this.props.message ? <p className="message">{this.props.message}</p> : null}
                <p className="button-row">
                    <button onClick={this.respond(true)}>Yes</button>
                    <button onClick={this.respond(false)}>No</button>
                </p>
            </div>
        );
    }
}
