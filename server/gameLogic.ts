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
    return {
        playerA: {
            player: playerA,
            eliminatedFriends: [] as UserInfo[],
        },
        playerB: {
            player: playerB,
            eliminatedFriends: [] as UserInfo[],
        },
        whosTurn: playerA.user.id,
        guessableFriends: mutualFriends(guessableFriends(playerA.friends), guessableFriends(playerB.friends)),
    };
}

export function clientGameFor(game: ServerGame, player: Player) {
    const gamePlayer = game.playerA.player.user.id === player.user.id ? game.playerA : game.playerB;
    return {
        yourTurn: player.user.id === game.whosTurn,
        chosenFriend: gamePlayer.chosenFriend,
        eliminatedFriends: gamePlayer.eliminatedFriends,
        guessableFriends: game.guessableFriends,
    };
}

export function gameForA(game: ServerGame): ClientGame {
    return clientGameFor(game, game.playerA.player);
}

export function gameForB(game: ServerGame): ClientGame {
    return clientGameFor(game, game.playerB.player);
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
