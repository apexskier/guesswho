import * as React from "react";
import * as FB from "FB";

interface LogoutProps {
    onLoggedOut: () => void;
}

export default function Logout(props: LogoutProps) {
    function logOut() {
        FB.logout((response) => {
            props.onLoggedOut();
        });
    }

    return <button onClick={logOut}>Log Out</button>;
}
