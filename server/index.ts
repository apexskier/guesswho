import * as express from "express";

import "../common/polyfills";
import WebApi from "./app";


let port = 7111;
let api = new WebApi(express(), port);
api.run();
