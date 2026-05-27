import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const port = process.env.PORT || "5173";
const cdpPort = process.env.CDP_PORT || "9222";
const appUrl = process.env.APP_URL || `http://127.0.0.1:${port}/app?rehearsal=1`;
const cdpUrl = process.env.CDP_URL || `http://127.0.0.1:${cdpPort}`;
const chromeUserDataDir = process.env.CHROME_USER_DATA_DIR || "/private/tmp/arkiv-local-rehearsal-chrome";

const started = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function originFor(url) {
  return new URL(url).origin;
}

async function fetchOk(url, timeoutMs = 1000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitFor(url, label, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await fetchOk(url)) return;
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${label} at ${url}.`);
}

async function isReachable(url, timeoutMs = 3000) {
  try {
    await waitFor(url, url, timeoutMs);
    return true;
  } catch {
    return false;
  }
}

function attachLogs(child, label) {
  if (process.env.VERIFY_VERBOSE !== "1") return;
  child.stdout?.on("data", (chunk) => process.stdout.write(`[${label}] ${chunk}`));
  child.stderr?.on("data", (chunk) => process.stderr.write(`[${label}] ${chunk}`));
}

function start(command, args, label) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.output = "";
  child.stdout?.on("data", (chunk) => {
    child.output += chunk.toString();
  });
  child.stderr?.on("data", (chunk) => {
    child.output += chunk.toString();
  });
  attachLogs(child, label);
  started.push(child);
  return child;
}

function chromeCommand() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;

  const candidates =
    process.platform === "darwin"
      ? [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
        ]
      : ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"];

  const filesystemCandidate = candidates.find((candidate) => candidate.startsWith("/") && existsSync(candidate));
  return filesystemCandidate || candidates.find((candidate) => !candidate.startsWith("/")) || candidates[0];
}

async function stopStartedProcesses() {
  for (const child of started.reverse()) {
    if (child.exitCode !== null || child.killed) continue;
    child.kill("SIGTERM");
    await sleep(250);
    if (child.exitCode === null && !child.killed) child.kill("SIGKILL");
  }
}

function runVerifier() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/verify-workbench.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env, APP_URL: appUrl, CDP_URL: cdpUrl },
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Workbench verifier failed with exit code ${code}.`));
    });
  });
}

async function main() {
  const appIsRunning = await isReachable(appUrl);
  if (!appIsRunning) {
    const appOriginIsRunning = await isReachable(originFor(appUrl), 1500);
    if (appOriginIsRunning) {
      console.log(`Waiting for existing local app route at ${appUrl}`);
      await waitFor(appUrl, "local app route", 20000);
    } else {
      console.log(`Starting local Vite app at ${appUrl}`);
      const vite = start("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", port, "--strictPort"], "vite");
      try {
        await waitFor(appUrl, "local app", 25000);
      } catch (error) {
        throw new Error(`${error.message}\n\nVite output:\n${vite.output || "(no output captured)"}`);
      }
    }
  }

  const cdpIsRunning = await fetchOk(`${cdpUrl}/json`);
  if (!cdpIsRunning) {
    console.log(`Starting headless Chrome CDP at ${cdpUrl}`);
    start(
      chromeCommand(),
      [
        "--headless=new",
        `--remote-debugging-port=${cdpPort}`,
        `--user-data-dir=${chromeUserDataDir}`,
        "--disable-gpu",
        "--no-first-run",
        "about:blank",
      ],
      "chrome",
    );
    await waitFor(`${cdpUrl}/json`, "Chrome CDP");
  }

  await runVerifier();
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(stopStartedProcesses);
