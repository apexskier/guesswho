import * as React from "react";
import * as ReactDOM from "react-dom";

import "./env";
import App from "./App";
import ga from "./analytics";
import Bugsnag from "./bugsnag";
import FB from "./facebook";

let fatalError: FatalError | undefined;
if (FB === null) {
    fatalError = {
        title: "Facebook Missing",
        message: "Your content blocker may be preventing the game from accessing Facebook. Please try reloading without content blockers",
    };
} else {
    FB.init({
        appId: FACEBOOK_APP_ID,
        xfbml: true,
        version: "v2.7",
    });
}

const root = document.getElementById("app");
if (root) {
    ReactDOM.render(<App fatalError={fatalError} />, root);
}
