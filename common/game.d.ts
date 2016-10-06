declare interface UserStatus {
    online: boolean;
    playing?: UserInfo;
}

declare interface Player {
    user: UserInfo;
    friends: UserInfo[];
    friendsInApp: string[];
    token: string;
}

declare interface GamePlayer {
    player: Player;
    chosenFriend?: UserInfo;
    eliminatedFriends: UserInfo[];
}

declare interface GameState {
    type: ClientActionRequest | "winner";
    player: GamePlayer | "both"; // if undefined, both players apply
}

declare interface ServerGame {
    id: string;
    playerA: GamePlayer;
    playerB: GamePlayer;
    guessableFriends: UserInfo[];
    state: GameState;
}

declare interface ClientGame {
    opponent: UserInfo;
    chosenFriend?: UserInfo;
    eliminatedFriends: UserInfo[];
    guessableFriends: UserInfo[];
}

declare const enum TurnType {
    Guess = 1,
    Question = 2,
}
