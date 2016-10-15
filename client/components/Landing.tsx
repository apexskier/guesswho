import * as React from "react";

import "./Landing.css";

import FB from "../facebook";
import FriendStatus from "./FriendStatus";


interface LandingProps {
    friends: UserInfo[];
    friendsOnline: { [player: string]: UserStatus };
    setUpGame: (friend: UserInfo) => ((event: React.MouseEvent) => void);
}

export default function Landing(props: LandingProps) {
    function inviteFriends(ev: React.MouseEvent) {
        FB.ui({
            method: "apprequests",
            message: "Play with me!",
            title: "Invite Friends",
            filters: ["app_non_users"],
        }, (response: any) => {});
        ev.preventDefault();
    }

    return (
        <div className="landing">
            <button className="invite-button" onClick={inviteFriends}>Invite</button>
            <h3>Friends to play with</h3>
            {props.friends.length === 0
                ? <p>You have no friends using this app 😢. <a href="#invite" onClick={inviteFriends}>Invite some!</a></p>
                : <ul className="friends">{props.friends.map((friend) => (
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
