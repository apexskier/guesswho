import * as React from "react";
import * as FB from "FB";

import FriendStatus from "./FriendStatus";


interface LandingProps {
    friends: UserInfo[];
    friendsOnline: { [player: string]: UserStatus };
    setUpGame: (friend: UserInfo) => ((event: React.MouseEvent) => void);
}

export default function Landing(props: LandingProps) {
    return (
        <div>
            <h3>Friends to play with</h3>
            {props.friends.length === 0
                ? <p>You have no friends using this app 😢. Invite some!</p>
                : <ul>{props.friends.map((friend) => (
                    <FriendStatus
                        key={friend.id}
                        friend={friend}
                        status={props.friendsOnline[friend.id]}
                        onClick={props.setUpGame(friend)}
                    />
                ))}</ul>}
        </div>
    );
}
