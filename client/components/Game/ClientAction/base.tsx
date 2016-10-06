import * as React from "react";
import autobind = require("autobind-decorator");

interface ClientActionProps {
    socket: SocketIOClient.Socket;
    token: string;
    message?: string;
}

interface ClientActionState {
    waiting: boolean;
}

export default class ClientAction extends React.Component<ClientActionProps, ClientActionState> {
    constructor(props: ClientActionProps) {
        super(props);
        this.state = { waiting: false };
    }

    @autobind
    protected sendResponse(response: ClientActionResponse) {
        this.props.socket.emit("action", response);
        this.setState({ waiting: true });
    }
}
