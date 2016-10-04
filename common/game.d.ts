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

declare interface ServerGame {
    playerA: GamePlayer;
    playerB: GamePlayer;
    whosTurn: string;
    winner?: string;
    guessableFriends: UserInfo[];
}

declare interface ClientGame {
    yourTurn: boolean;
    chosenFriend?: UserInfo;
    eliminatedFriends: UserInfo[];
    guessableFriends: UserInfo[];
}

declare interface UserStatus {
    online: boolean;
    playing?: UserInfo;
}

declare const enum TurnType { Guess, Question }
