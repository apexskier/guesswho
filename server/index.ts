import * as express from "express";

import "../common/polyfills";
import WebApi from "./app";


const port = 7111;
const api = new WebApi(express(), port);
api.run();
