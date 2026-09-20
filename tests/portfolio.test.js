import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("portfolio files exist", () => {
  assert.equal(fs.existsSync("index.html"), true);
  assert.equal(fs.existsSync("styles.css"), true);
  assert.equal(fs.existsSync("script.js"), true);
  assert.equal(fs.existsSync("server.js"), true);
});

test("portfolio package is configured", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

  assert.equal(pkg.type, "module");
  assert.equal(pkg.scripts.start, "node server.js");
});