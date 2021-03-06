import * as express from "express";


function guessableFriends(friends: UserInfo[]): UserInfo[] {
    return friends.filter((f) => {
        return f.picture && !f.picture.data.is_silhouette;
    });
}

function mutualFriends(aFriends: UserInfo[], bFriends: UserInfo[]): UserInfo[] {
    return aFriends.filter((aF) => {
        return bFriends.some((bF) => {
            return aF.name === bF.name;
            // TODO hash images and test equality
        });
    });
}

export function newGame(playerA: Player, playerB: Player): ServerGame {
    const game = {
        id: `id-${Math.random()}`, // TODO: replace with guid
        players: {} as { [id: string]: GamePlayer },
        guessableFriends: mutualFriends(guessableFriends(playerA.friends), guessableFriends(playerB.friends)),
    };
    game.players[playerA.user.id] = {
        player: playerA,
        eliminatedFriends: [] as userID[],
        chosenFriend: null,
        status: {
            type: "ChoosePerson",
            message: "Choose a friend",
        },
    };
    game.players[playerB.user.id as string] = {
        player: playerB,
        eliminatedFriends: [] as userID[],
        chosenFriend: null,
        status: {
            type: "ChoosePerson",
            message: "Choose a friend",
        },
    };
    return game;
}

export function clientGameFor(game: ServerGame, player: Player): ClientGame {
    const gamePlayer = game.players[player.user.id];
    const opponentId = Object.keys(game.players).find((id) => id !== player.user.id as string);
    const opponent = game.players[opponentId];
    return {
        opponent: opponent.player.user,
        chosenFriend: gamePlayer.chosenFriend,
        eliminatedFriends: gamePlayer.eliminatedFriends,
        guessableFriends: game.guessableFriends,
        status: gamePlayer.status,
    };
}


/*
Game logic

- fetch list of taggable friends for each user (at some point, at login or at game start)

- start game
- get list of guessable mutual friends
- send list to both clients
- ask both players for a chosen friend
- choose a player to go first
TURN
- going player sends Guess? or Ask?
- if Guess
  - going player sends guess
  - if correct
    - player wins
  - else
    - report no to going player
    - report "going player guessed X" to waiting player
- if Ask
  - going player sends question
  - send waiting player question
  - waiting player sends yes/no
  - send going player response
  - going player sends eliminations
  - going player sends "turn over"
- swap going player/waiting player
- GOTO TURN
*/
