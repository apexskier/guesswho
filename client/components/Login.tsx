import * as React from "react";

import FB from "../facebook";
import "./Login.css";


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

    return (
        <div className="login-screen">
            <h1>Guess Who‽</h1>
            <button onClick={logIn}>Log in with Facebook</button>
        </div>
    );
}
