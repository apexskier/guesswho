declare interface AuthedMessage {
    token: string;
}

declare interface InitializationMessage extends AuthedMessage {
    me: UserInfo;
    friends: UserInfo[];
    /**
     * Set of User IDs
     */
    friendsInApp: string[];
}

declare interface GameStartMessage extends AuthedMessage {
    /**
     * User ID
     */
    with: string;
}

declare interface ErrorMessage {
    message: string;
}

declare type ClientAction = "ChoosePerson" | "Question" | "YesNo" | "ChooseTurnType"

declare interface ClientChoosePersonResponse extends AuthedMessage {
    type: "ChoosePerson";
    /**
     * User ID
     */
    response: string;
}

declare interface ClientQuestionResponse extends AuthedMessage {
    type: "Question";
    response: string;
}

declare interface ClientYesNoResponse extends AuthedMessage {
    type: "YesNo";
    response: boolean;
}

declare interface ClientChooseTurnTypeResponse extends AuthedMessage {
    type: "ChooseTurnType";
    response: TurnType;
}

declare interface ClientActionRequest {
    type: ClientAction;
    message?: string;
}

declare type ClientActionResponse = ClientChoosePersonResponse | ClientQuestionResponse | ClientYesNoResponse | ClientChooseTurnTypeResponse;
