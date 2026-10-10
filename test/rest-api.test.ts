import assert from "assert";
import express from "express";
import http from "http";
import generate from "../src/rest-api/generate";

describe("REST API Endpoints", function () {
  this.timeout(30000);
  let server: http.Server;
  let baseUrl: string;

  before(function (done) {
    const app = express();
    app.use(express.json());
    app.all("/generate", generate);
    server = app.listen(0, () => {
      const address = server.address() as any;
      baseUrl = `http://127.0.0.1:${address.port}`;
      done();
    });
  });

  after(function (done) {
    server.close(done);
  });

  it("should return 405 on unsupported methods", async function () {
    const res = await fetch(`${baseUrl}/generate`, { method: "DELETE" });
    assert.strictEqual(res.status, 405);
    const body = (await res.json()) as any;
    assert.strictEqual(body.error, "INVALID_METHOD");
  });

  it("should return 400 when source is missing", async function () {
    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.strictEqual(res.status, 400);
    const body = (await res.json()) as any;
    assert.strictEqual(body.error, "EMPTY_SOURCE");
  });

  it("should return 200 and application/pdf on valid HTML POST", async function () {
    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "<h2>Test PDF API</h2>" }),
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get("content-type"), "application/pdf");
    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 0);
  });

  it("should return 200 and base64 string when base64 is true", async function () {
    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "<h2>Base64 Test</h2>", base64: true }),
    });
    assert.strictEqual(res.status, 200);
    assert.ok(
      res.headers.get("content-type")?.includes("text/plain"),
      "Expected text/plain content type"
    );
    const text = await res.text();
    assert.ok(text.length > 0);
    const decoded = Buffer.from(text, "base64");
    assert.ok(decoded.length > 0);
  });

  it("should return 500 on invalid URL request", async function () {
    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "http://invalid-non-existent-domain-test-12345.xyz",
        timeout: 3,
      }),
    });
    assert.strictEqual(res.status, 500);
    const body = (await res.json()) as any;
    assert.strictEqual(body.error, "SERVER_ERROR");
  });
});
