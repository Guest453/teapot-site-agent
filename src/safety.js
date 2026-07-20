import path from "node:path";

export const MAX_FILES = 8;
export const MAX_FILE_BYTES = 150_000;
export const MAX_CONTEXT_BYTES = 500_000;

const ALLOWED_EXTENSIONS = new Set([
  ".html",
  ".css",
  ".js",
  ".json",
  ".md",
  ".txt",
  ".svg",
  ".xml",
  ".webmanifest",
]);

const DISALLOWED_CONTENT = [
  { pattern: /<iframe\b/i, message: "iframes are not allowed" },
  { pattern: /\bjavascript\s*:/i, message: "javascript: URLs are not allowed" },
  { pattern: /<script\b[^>]*\bsrc\s*=\s*["']?\s*(?:https?:)?\/\//i, message: "remote scripts are not allowed" },
  { pattern: /<link\b[^>]*\bhref\s*=\s*["']?\s*(?:https?:)?\/\//i, message: "remote linked assets are not allowed" },
  { pattern: /<form\b[^>]*\baction\s*=/i, message: "form submission endpoints are not allowed" },
  { pattern: /\b(?:fetch|sendBeacon)\s*\(\s*["'`]\s*(?:https?:)?\/\//i, message: "remote data requests are not allowed" },
];

export function normalizeSitePath(candidate) {
  if (typeof candidate !== "string") throw new Error("File path must be a string");
  const normalized = candidate.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized.startsWith("site/")) throw new Error(`Path must stay in site/: ${candidate}`);
  if (normalized.includes("\0") || normalized.split("/").includes("..")) {
    throw new Error(`Unsafe path: ${candidate}`);
  }
  if (normalized === "site/CNAME") return normalized;
  if (!ALLOWED_EXTENSIONS.has(path.posix.extname(normalized).toLowerCase())) {
    throw new Error(`Unsupported file type: ${candidate}`);
  }
  return normalized;
}

export function validateChanges(changes) {
  if (!Array.isArray(changes) || changes.length === 0) throw new Error("The agent proposed no changes");
  if (changes.length > MAX_FILES) throw new Error(`The agent proposed more than ${MAX_FILES} files`);

  const seen = new Set();
  return changes.map((change) => {
    const filePath = normalizeSitePath(change.path);
    if (seen.has(filePath)) throw new Error(`Duplicate file: ${filePath}`);
    seen.add(filePath);
    if (typeof change.content !== "string") throw new Error(`Missing content for ${filePath}`);
    if (Buffer.byteLength(change.content, "utf8") > MAX_FILE_BYTES) {
      throw new Error(`${filePath} exceeds ${MAX_FILE_BYTES} bytes`);
    }
    if (filePath.endsWith(".html") && !/<html[\s>]/i.test(change.content)) {
      throw new Error(`${filePath} does not look like a complete HTML document`);
    }
    for (const rule of DISALLOWED_CONTENT) {
      if (rule.pattern.test(change.content)) throw new Error(`${filePath}: ${rule.message}`);
    }
    return { ...change, path: filePath };
  });
}

export function isReadableSiteText(candidate, size = 0) {
  try {
    normalizeSitePath(candidate);
    return size <= MAX_FILE_BYTES;
  } catch {
    return false;
  }
}
