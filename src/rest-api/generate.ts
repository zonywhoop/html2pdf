/**
 * @iamdual/html2pdf
 * @author Ekin Karadeniz <iamdual@icloud.com>
 * @source https://github.com/iamdual/html2pdf
 */

import { TimeoutError } from "puppeteer";
import { Request, Response } from "express";
import Config from "../config";
import Generator from "../generator";
import logger from "../logger";

let requestCounter = 0;

export default async (req: Request, res: Response) => {
  const reqId = ++requestCounter;
  const startTime = Date.now();
  const method = req.method;
  const ip = req.ip || req.socket.remoteAddress || "unknown";

  if (!["GET", "POST"].includes(method)) {
    const duration = Date.now() - startTime;
    logger.warn(
      `[#${reqId}] ${method} /generate - Status: 405 Method Not Allowed | IP: ${ip} (${duration}ms)`
    );
    res
      .status(405)
      .json({ error: "INVALID_METHOD", errorMessage: "Method not allowed." });
    return;
  }

  let config: Config;
  if (method === "POST") {
    config = new Config(req.body);
  } else {
    config = new Config(req.query);
  }

  if (!config.source) {
    const duration = Date.now() - startTime;
    logger.warn(
      `[#${reqId}] ${method} /generate - Status: 400 Bad Request (EMPTY_SOURCE) | IP: ${ip} (${duration}ms)`
    );
    res
      .status(400)
      .json({ error: "EMPTY_SOURCE", errorMessage: "Please enter a source." });
    return;
  }

  // Log inbound request
  if (config.isUrl) {
    logger.info(
      `[#${reqId}] Inbound URL request: ${method} /generate | URL: "${config.source}" | Timeout: ${config.timeout / 1000}s | IP: ${ip}`
    );
  } else {
    const snippet = config.source.slice(0, 80).replace(/\s+/g, " ");
    const preview = config.source.length > 80 ? `${snippet}...` : snippet;
    logger.info(
      `[#${reqId}] Inbound HTML request: ${method} /generate | Source length: ${config.source.length} chars | Preview: "${preview}" | Timeout: ${config.timeout / 1000}s | IP: ${ip}`
    );
  }

  try {
    const pdf = await Generator(config);
    const duration = Date.now() - startTime;

    if (config.base64) {
      const base64Data = Buffer.from(pdf).toString("base64");
      logger.info(
        `[#${reqId}] Request completed: 200 OK | Duration: ${duration}ms | Output: Base64 (${base64Data.length} chars) | Source: "${config.source.slice(0, 100)}"`
      );
      res.set("Content-Type", "text/plain");
      res.status(200).send(base64Data);
      return;
    }

    logger.info(
      `[#${reqId}] Request completed: 200 OK | Duration: ${duration}ms | Output: PDF (${pdf.byteLength} bytes) | Source: "${config.source.slice(0, 100)}"`
    );
    res.set("Content-Type", "application/pdf");
    res.status(200).send(Buffer.from(pdf));
    return;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    if (error instanceof TimeoutError) {
      logger.warn(
        `[#${reqId}] Request timeout: 408 TIMEOUT | Duration: ${duration}ms | Source: "${config.source.slice(0, 100)}" | Error: ${error.message}`
      );
      res
        .status(408)
        .json({ error: "TIMEOUT", errorMessage: "Request timeout." });
      return;
    }

    logger.error(
      `[#${reqId}] Request failed: 500 SERVER_ERROR | Duration: ${duration}ms | Source: "${config.source.slice(0, 100)}" | Error: ${error?.message || error}`,
      error?.stack || ""
    );
    res.status(500).json({
      error: "SERVER_ERROR",
      errorMessage: "We are unable to fulfill your request.",
    });
  }
};
