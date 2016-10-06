import * as React from "react";
import autobind = require("autobind-decorator");

import ClientActionComponent from "./base";


export default class Question extends ClientActionComponent {
    private questionEl: any;

    @autobind
    private sendQuestion() {
        const question = this.questionEl.value || "";
        if (question.length > 0) {
            this.sendResponse({
                token: this.props.token,
                type: "Question",
                response: question,
            });
        }
    }

    render() {
        return (
            <div>
                {this.props.message ? <p>{this.props.message}</p> : null}
                <textarea
                    ref={(el) => {
                        this.questionEl = el;
                    }}
                    placeholder="Ask a question"
                ></textarea>
                <p>
                    <button onClick={this.sendQuestion}>Send</button>
                </p>
            </div>
        );
    }
}
