import * as React from "react";
import autobind = require("autobind-decorator");

import "./action.css"

import sendAction from "../../sendAction";


interface ClientActionProps {
    socket: SocketIOClient.Socket;
    token: string;
    message?: string;
    onComplete: Function;
}

interface ClientActionState {
    waiting: boolean;
}

export default class ClientAction extends React.PureComponent<ClientActionProps, ClientActionState> {
    @autobind
    protected sendResponse(response: ClientResponse) {
        sendAction(this.props.socket, response);
        this.props.onComplete();
    }
}
