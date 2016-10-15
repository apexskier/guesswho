import * as React from "react";
import * as ReactDOM from "react-dom";
import * as FB from "FB";

import "./env";
import App from "./App";
import ga from "./analytics";
import Bugsnag from "./bugsnag";

FB.init({
    appId: FACEBOOK_APP_ID,
    xfbml: true,
    version: "v2.7",
});

const root = document.getElementById("app");
if (root) {
    ReactDOM.render(<App />, root);
}
