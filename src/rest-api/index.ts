/**
 * @iamdual/html2pdf
 * @author Ekin Karadeniz <iamdual@icloud.com>
 * @source https://github.com/iamdual/html2pdf
 */

import express, { Express, Request, Response, NextFunction } from "express";
import generate from "./generate";
import logger from "../logger";

export const route: Express = express();
route.use(express.json());
route.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError) {
    logger.warn(`Invalid JSON received on ${req.method} ${req.url}: ${err.message}`);
    res
      .status(400)
      .send({ error: "INVALID_REQUEST", errorMessage: err.message });
    return;
  }
  if (err) {
    logger.error(`Unhandled request error on ${req.method} ${req.url}:`, err);
  }
  next();
});
route.all("/generate", generate);

const port = process.env.HTML2PDF_API_PORT || 3000;
export const server = route.listen(port, () => {
  logger.info("Server has been started on http://localhost:%d", port);
});
