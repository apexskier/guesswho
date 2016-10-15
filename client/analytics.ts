/// <reference path="../node_modules/@types/google.analytics/index.d.ts" />

import "./env";

const pkg = require("../package.json");

(window as any).ga = (window as any).ga || function() {
    (ga.q = ga.q || []).push(arguments);
};
ga.l = +new Date;

ga("create", GOOGLE_ANALYTICS_ID, "auto");
ga("set", "appName", pkg.name);
ga("set", "appVersion", pkg.version);

export default ga;
