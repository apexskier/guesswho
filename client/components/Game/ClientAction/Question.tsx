import * as React from "react";
import autobind = require("autobind-decorator");

import ClientActionComponent from "./base";


export default class Question extends ClientActionComponent {
    private questionEl: any;

    @autobind
    private sendQuestion(ev: React.FormEvent) {
        const question = this.questionEl.value || "";
        if (question.length > 0) {
            this.sendResponse({
                token: this.props.token,
                type: "Question",
                response: question,
            });
        }
        ev.preventDefault();
    }

    render() {
        return (
            <form action="/" onSubmit={this.sendQuestion}>
                {this.props.message ? <p className="message">{this.props.message}</p> : null}
                <textarea
                    ref={(el) => {
                        this.questionEl = el;
                    }}
                    placeholder="Ask a question"
                ></textarea>
                <p className="button-row">
                    <button type="submit">Send</button>
                </p>
            </form>
        );
    }
}
