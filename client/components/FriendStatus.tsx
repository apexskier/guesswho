import * as React from "react";

import "./FriendStatus.css";


interface FriendStatusProps {
    friend: UserInfo;
    status?: UserStatus;
    onClick: (event: React.MouseEvent) => void;
}

export default function FriendStatus(props: FriendStatusProps): JSX.Element {
    const friend = props.friend;
    const status = props.status;
    let classes = "friend-status";
    if (status) {
        if (status.online) {
            classes += " friend-status-online";
        }
        if (status.playing) {
            classes += " friend-status-in-game";
        }
    }
    return (
        <li className={classes} onClick={props.onClick}>
            {friend.picture !== undefined &&
                // !friend.picture.data.is_silhouette &&
                <span><img className="picture" src={friend.picture.data.url} />&nbsp;</span>}
            {status
                ? (
                    <span>
                        {friend.name}
                        {status.playing && (
                            <span>
                                &nbsp;
                                <small>vs</small>
                                &nbsp;
                                {(status.playing.picture) ? <img className="opponent" src={status.playing.picture.data.url} alt={status.playing.name} /> : status.playing.name}
                            </span>
                        )}
                    </span>
                ) : friend.name}
        </li>
    );
}
