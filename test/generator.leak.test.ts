import assert from "assert";
import Config from "../src/config";
import Generator from "../src/generator";
import { execSync } from "child_process";

const getChromiumProcessCount = (): number => {
  try {
    // Only count active (non-zombie) chromium processes
    const stdout = execSync(
      "ps -eo stat,comm 2>/dev/null | awk '$1 !~ /^Z/ && $2 ~ /chromium/ {print $2}' | wc -l"
    )
      .toString()
      .trim();
    return parseInt(stdout || "0", 10);
  } catch {
    return 0;
  }
};

describe("Chromium lifecycle & leak prevention", function () {
  this.timeout(30000);

  it("should not leave chromium running after successful HTML conversion", async function () {
    const initialCount = getChromiumProcessCount();
    const config = new Config({ source: "<h1>Hello World</h1>" });
    const pdf = await Generator(config);

    assert.ok(pdf instanceof Uint8Array);
    assert.ok(pdf.length > 0);

    // Give process a brief moment to finish terminating
    await new Promise((r) => setTimeout(r, 1000));
    const finalCount = getChromiumProcessCount();
    assert.strictEqual(
      finalCount,
      initialCount,
      `Chromium processes leaked after success! Before: ${initialCount}, After: ${finalCount}`
    );
  });

  it("should not leave chromium running when an invalid URL fails", async function () {
    const initialCount = getChromiumProcessCount();
    const config = new Config({
      source: "http://invalid-non-existent-domain-test-12345.xyz",
      timeout: 3,
    });

    let errorThrown = false;
    try {
      await Generator(config);
    } catch (err) {
      errorThrown = true;
    }
    assert.strictEqual(errorThrown, true, "Expected Generator to fail on invalid URL");

    await new Promise((r) => setTimeout(r, 1000));
    const finalCount = getChromiumProcessCount();
    assert.strictEqual(
      finalCount,
      initialCount,
      `Chromium processes leaked after invalid URL! Before: ${initialCount}, After: ${finalCount}`
    );
  });

  it("should not leave chromium running when PDF creation options fail", async function () {
    const initialCount = getChromiumProcessCount();
    // Invalid page range for a 1-page document throws an error in puppeteer
    const config = new Config({
      source: "<h1>Single Page</h1>",
      pageRanges: "999-1000",
    });

    let errorThrown = false;
    try {
      await Generator(config);
    } catch (err) {
      errorThrown = true;
    }
    assert.strictEqual(errorThrown, true, "Expected Generator to fail on invalid page ranges");

    await new Promise((r) => setTimeout(r, 1000));
    const finalCount = getChromiumProcessCount();
    assert.strictEqual(
      finalCount,
      initialCount,
      `Chromium processes leaked after PDF options failure! Before: ${initialCount}, After: ${finalCount}`
    );
  });
});
