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
