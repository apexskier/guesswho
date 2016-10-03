import * as React from "react";
import * as ReactDOM from "react-dom";
import * as FB from "FB";

import App from "./App";

FB.init({
    appId: "1773551739581397",
    xfbml: true,
    version: "v2.7",
});

ReactDOM.render(
    <App />,
    document.getElementById("app")
);
