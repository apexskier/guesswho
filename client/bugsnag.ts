/// <reference path="../typings/globals/bugsnag/index.d.ts" />

import "./env";

const pkg = require("../package.json");

const Bugsnag = (window as any).Bugsnag as BugsnagStatic;

Bugsnag.apiKey = BUGSNAG_API_KEY;
Bugsnag.releaseStage = NODE_ENV;
Bugsnag.appVersion = pkg.version;
Bugsnag.notifyReleaseStages = ["production"];

export default Bugsnag;
