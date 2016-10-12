import * as React from "react";
import * as FB from "FB";

import "./Logout.css";


interface LogoutProps {
    onLoggedOut: () => void;
}

export default function Logout(props: LogoutProps) {
    function logOut() {
        FB.logout((response) => {
            props.onLoggedOut();
        });
    }

    return <button className="logout-button" onClick={logOut}>Log Out</button>;
}
