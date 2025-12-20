import express, { type Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { rateLimit } from "../ops/rateLimit.js";
import { incRequest } from "../ops/metrics.js";

export const app: Express = express();

app.use(cors());
app.use(express.json());

// basic rate limit (sessionId unit via getSessionId)
app.use(
  rateLimit({
    windowMs: 60_000,
    maxRequests: 120,
  })
);

// request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  incRequest();
  console.log(`${req.method} ${req.url}`);
  next();
});
