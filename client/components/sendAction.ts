import ga from "../analytics";

export default function sendAction(socket: SocketIOClient.Socket, data: ClientResponse) {
    socket.emit("action", data);
    ga("send", "event", {
        eventCategory: "action",
        eventAction: data.type,
        eventValue: JSON.stringify(data.response),
    });
}
