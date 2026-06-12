import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";

const app: Express = express();

// Redirect geoquestgame.live to game.geoquestgame.com (301 permanent)
app.use((req, res, next) => {
  if (req.hostname === 'geoquestgame.live') {
    return res.redirect(301, `https://game.geoquestgame.com${req.originalUrl}`);
  }
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({
  origin: true,
  credentials: true,
}));

export default app;
