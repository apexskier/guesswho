declare interface UserStatus {
    online: boolean;
    playing?: UserInfo;
}

declare interface Player {
    user: UserInfo;
    friends: UserInfo[];
    friendsInApp: userID[];
    token: string;
}

declare interface GamePlayer {
    player: Player;
    chosenFriend: userID | null;
    eliminatedFriends: userID[];
    status: ClientActionRequest | "winner";
}

declare interface GameState {
    type: ClientActionRequest | "winner";
    player: GamePlayer | "both"; // if undefined, both players apply
}

declare interface ServerGame {
    id: string;
    players: { [id: string]: GamePlayer }; // string is userID
    guessableFriends: UserInfo[];
}

declare interface ClientGame {
    opponent: UserInfo;
    chosenFriend: userID | null;
    eliminatedFriends: userID[];
    guessableFriends: UserInfo[];
    status: ClientActionRequest | "winner";
}

declare const enum TurnType {
    Guess = 1,
    Question = 2,
}
