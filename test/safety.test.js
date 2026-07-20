import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSitePath, validateChanges } from "../src/safety.js";

test("allows ordinary site files", () => {
  assert.equal(normalizeSitePath("site/index.html"), "site/index.html");
  assert.equal(normalizeSitePath("./site/styles.css"), "site/styles.css");
});

test("rejects traversal and non-site files", () => {
  assert.throws(() => normalizeSitePath("site/../src/server.js"));
  assert.throws(() => normalizeSitePath(".github/workflows/evil.yml"));
  assert.throws(() => normalizeSitePath("site/payload.exe"));
});

test("requires complete HTML and unique paths", () => {
  assert.throws(() => validateChanges([{ path: "site/index.html", content: "hello" }]));
  assert.throws(() =>
    validateChanges([
      { path: "site/app.js", content: "one" },
      { path: "site/app.js", content: "two" },
    ]),
  );
});

test("rejects remote executable content and submission endpoints", () => {
  const document = (body) => `<html><body>${body}</body></html>`;
  assert.throws(() =>
    validateChanges([{ path: "site/index.html", content: document('<script src="https://evil.example/x.js"></script>') }]),
  );
  assert.throws(() =>
    validateChanges([{ path: "site/index.html", content: document('<form action="https://evil.example"></form>') }]),
  );
  assert.throws(() => validateChanges([{ path: "site/app.js", content: 'fetch("https://evil.example")' }]));
});
