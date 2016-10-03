import * as React from "react";
import * as FB from "FB";

interface LoginProps {
    onLoggedIn: (response: any) => void;
}

export default function Login(props: LoginProps) {
    function logIn() {
        FB.login((response) => {
            if (response.status === "connected") {
                props.onLoggedIn(response.authResponse);
            }
        }, {scope: "public_profile,user_friends,email"});
    }

    return <button onClick={logIn}>Log In</button>;
}
