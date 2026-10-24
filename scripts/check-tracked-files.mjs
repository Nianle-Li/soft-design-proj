import { spawnSync } from "node:child_process";
import process from "node:process";

const git = spawnSync("git", ["ls-files", "-z"], { encoding: "utf8" });
if (git.status !== 0) {
  process.stderr.write(git.stderr || "Unable to list tracked files.\n");
  process.exit(1);
}

const tracked = git.stdout.split("\0").filter(Boolean);
const forbidden = tracked.filter((path) => {
  const normalized = path.replaceAll("\\", "/");
  const basename = normalized.split("/").at(-1) ?? "";
  if (normalized === "AGENTS.md") {
    return true;
  }
  if (
    /^(node_modules|coverage|dist|tmp|\.agents|\.npm-cache|\.cache|\.idea|\.vscode)\//u.test(
      normalized
    )
  ) {
    return true;
  }
  if (basename === ".env" || (basename.startsWith(".env.") && basename !== ".env.example")) {
    return true;
  }
  if (/\.(log|tsbuildinfo)$/iu.test(basename)) {
    return true;
  }
  return (
    normalized.endsWith(".svg") &&
    normalized !== "doc/assets/architecture.svg" &&
    !normalized.startsWith("test/fixtures/svg/")
  );
});

if (forbidden.length > 0) {
  process.stderr.write(`Forbidden tracked files:\n${forbidden.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Tracked-file hygiene PASS (${tracked.length} paths checked).\n`);
}
