/**
 * @zonywhoop/html2pdf
 * @author Ekin Karadeniz <iamdual@icloud.com>
 * @source https://github.com/zonywhoop/html2pdf
 */

import Config from "../config";
import puppeteer, { Browser } from "puppeteer";
import logger from "../logger";

let args: string[] = [];
if (process.env.HTML2PDF_NO_SANDBOX) {
  args.push("--no-sandbox");
}

export default async (config: Config): Promise<Uint8Array> => {
  // Create a browser instance
  const browser = await puppeteer.launch({
    headless: true,
    args: args,
  });

  try {
    // Create a new page
    const page = await browser.newPage();

    // Set timeout
    page.setDefaultNavigationTimeout(config.timeout);

    // Set JavaScript enabled
    await page.setJavaScriptEnabled(config.javascript);

    // Set CSS media type
    await page.emulateMediaType(config.mediaType);

    if (config.userAgent) {
      // Set user-agent
      await page.setUserAgent(config.userAgent);
    }

    if (config.isUrl) {
      // https://pptr.dev/api/puppeteer.page.goto
      await page.goto(config.source, { waitUntil: "networkidle2" });
    } else {
      // https://pptr.dev/api/puppeteer.page.setcontent
      await page.setContent(config.source, { waitUntil: "networkidle2" });
    }

    // https://pptr.dev/api/puppeteer.pdfoptions
    const pdf = await page.pdf({
      timeout: config.timeout,
      pageRanges: config.pageRanges,
      printBackground: config.printBackground,
      format: config.format,
      width: config.width,
      height: config.height,
      scale: config.scale,
      landscape: config.landscape,
      margin: config.margin,    
      displayHeaderFooter: config.displayHeaderFooter,
      headerTemplate: config.headerTemplate,
      footerTemplate: config.footerTemplate,
    });

    return pdf;
  } finally {
    // Ensure the browser instance is always closed, preventing orphaned chromium processes
    await closeBrowser(browser);
  }
};

const closeBrowser = async (browser: Browser): Promise<void> => {
  try {
    const closePromise = browser.close();
    const timeoutPromise = new Promise<void>((_, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Browser close timed out")),
        5000
      );
      timer.unref?.();
    });
    await Promise.race([closePromise, timeoutPromise]);
  } catch (err) {
    logger.warn("Failed to close browser gracefully, forcing process kill:", err);
    try {
      const proc = browser.process();
      if (proc && !proc.killed) {
        proc.kill("SIGKILL");
      }
    } catch (killErr) {
      logger.error("Failed to kill browser process:", killErr);
    }
  }
};
