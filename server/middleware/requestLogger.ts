import * as express from "express";

const requestLogger: express.RequestHandler = (
    request: express.Request,
    response: express.Response,
    next: express.NextFunction
) => {
    console.info(`${(new Date()).toUTCString()}|${request.method}|${request.url}|${request.ip}`);
    next();
};

export default requestLogger;
