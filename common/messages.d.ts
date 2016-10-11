declare interface AuthedMessage {
    token: string;
}

declare interface InitializationMessage extends AuthedMessage {
    me: UserInfo;
    friends: UserInfo[];
    friendsInApp: userID[];
}

declare interface GameStartMessage extends AuthedMessage {
    with: userID;
}

declare interface ErrorMessage {
    message: string;
}

declare type ClientAction =
    "ChoosePerson" |
    "Question" |
    "Guess" |
    "YesNo" |
    "ChooseTurnType" |
    "Complete" |
    "Wait" |
    "Eliminate" |
    "Cleanup";

declare interface ClientActionRequest {
    type: ClientAction;
    message?: string;
}

interface ClientResponse extends AuthedMessage {
    type: ClientAction;
    response: any;
}

declare interface ClientChoosePersonResponse extends ClientResponse {
    type: "ChoosePerson" | "Guess";
    response: userID;
}

declare interface ClientQuestionResponse extends ClientResponse {
    type: "Question";
    response: string;
}

declare interface ClientYesNoResponse extends ClientResponse {
    type: "YesNo";
    response: boolean;
}

declare interface ClientChooseTurnTypeResponse extends ClientResponse {
    type: "ChooseTurnType";
    response: TurnType;
}

declare interface ClientCompleteResponse extends ClientResponse {
    type: "Complete";
    response: string;
}

declare interface ClientEliminateResponse extends ClientResponse {
    type: "Eliminate";
    response: userID[];
}

declare interface ClientCleanupResponse extends ClientResponse {
    type: "Cleanup";
}
