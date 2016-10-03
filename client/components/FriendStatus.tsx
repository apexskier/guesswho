import * as React from "react";

interface FriendStatusProps {
    friend: UserInfo;
    status?: UserStatus;
    onClick: (event: React.MouseEvent) => void;
}

export default function Login(props: FriendStatusProps): JSX.Element {
    const friend = props.friend;
    const status = props.status;
    return (
        <div onClick={props.onClick}>
            {status
                ? (
                    <div>
                        {friend.name}&nbsp;
                        {status.online ? <i>(online)</i> : null}
                        {status.playing ? <i>(in game with {status.playing.name})</i> : null}
                    </div>
                ) : <div>{friend.name}</div>}
        </div>
    );
}
