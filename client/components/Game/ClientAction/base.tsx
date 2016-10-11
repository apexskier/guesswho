import * as React from "react";
import autobind = require("autobind-decorator");

import "./action.css"


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
        this.props.socket.emit("action", response);
        this.props.onComplete();
    }
}
