import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const cdpUrl = process.env.CDP_URL || "http://127.0.0.1:9222";
// This verifier intentionally drives the no-wallet rehearsal route.
// Live Braga writes require MetaMask confirmation and must be checked manually at /app.
const appUrl = process.env.APP_URL || "http://127.0.0.1:5173/app?rehearsal=1";
const screenshotDir = process.env.SCREENSHOT_DIR || "/private/tmp";

const desktopWorkbenchShot = resolve(screenshotDir, "arkiv-care-workbench-desktop.png");
const desktopWriteShot = resolve(screenshotDir, "arkiv-care-write-desktop.png");
const desktopGrantShot = resolve(screenshotDir, "arkiv-care-grant-desktop.png");
const mobileWorkbenchShot = resolve(screenshotDir, "arkiv-care-workbench-mobile.png");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function delay(ms) {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function connectToPage() {
  let tabs;
  try {
    tabs = await (await fetch(`${cdpUrl.replace(/\/$/, "")}/json`)).json();
  } catch (error) {
    throw new Error(
      `Could not reach Chrome CDP at ${cdpUrl}. Start Chrome with --remote-debugging-port=9222, then rerun npm run verify:workbench. ${error.message}`,
    );
  }

  const page = tabs.find((tab) => tab.type === "page" && tab.url.includes("/app")) || tabs.find((tab) => tab.type === "page");
  assert(page?.webSocketDebuggerUrl, "No debuggable Chrome page was found.");

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const errors = [];

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
      return;
    }

    if (message.method === "Runtime.exceptionThrown") {
      errors.push(message.params?.exceptionDetails?.text || "Runtime exception");
    }
    if (message.method === "Runtime.consoleAPICalled" && message.params?.type === "error") {
      const text = message.params.args?.map((arg) => arg.value || arg.description).filter(Boolean).join(" ");
      errors.push(text || "Console error");
    }
    if (message.method === "Log.entryAdded" && message.params?.entry?.level === "error") {
      errors.push(message.params.entry.text || "Log error");
    }
  };

  await new Promise((resolveOpen) => {
    socket.onopen = resolveOpen;
  });

  const send = (method, params = {}) =>
    new Promise((resolveSend) => {
      const nextId = ++id;
      pending.set(nextId, resolveSend);
      socket.send(JSON.stringify({ id: nextId, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");

  return {
    close: () => socket.close(),
    getErrors: () => errors,
    send,
  };
}

async function evaluate(send, expression) {
  const response = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
  });

  if (response.result?.exceptionDetails) {
    throw new Error(response.result.exceptionDetails.text || "Runtime evaluation failed.");
  }

  return response.result.result.value;
}

async function screenshot(send, path) {
  mkdirSync(dirname(path), { recursive: true });
  const response = await send("Page.captureScreenshot", {
    captureBeyondViewport: false,
    format: "png",
  });
  writeFileSync(path, Buffer.from(response.result.data, "base64"));
}

async function setViewport(send, width, height, mobile = false) {
  await send("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: mobile ? 2 : 1,
    height,
    mobile,
    width,
  });
}

async function navigate(send, url) {
  await send("Page.navigate", { url });
  await waitForText(send, "CARE PASSPORT", 10000);
}

async function waitForText(send, text, timeoutMs = 6000) {
  const started = Date.now();
  const expected = text.toLowerCase();
  while (Date.now() - started < timeoutMs) {
    const found = await evaluate(send, `document.body.innerText.toLowerCase().includes(${JSON.stringify(expected)})`);
    if (found) return;
    await delay(150);
  }
  const bodyText = await evaluate(send, "document.body.innerText.slice(0, 2600)");
  throw new Error(`Timed out waiting for text: ${text}\n\nVisible text:\n${bodyText}`);
}

async function clickText(send, text) {
  const clicked = await evaluate(
    send,
    `(() => {
      const target = ${JSON.stringify(text)};
      const controls = [...document.querySelectorAll("button, a, summary")];
      const element = controls.find((node) => node.textContent.trim() === target && !node.disabled);
      if (!element) return false;
      element.click();
      return true;
    })()`,
  );
  assert(clicked, `Could not click visible control: ${text}`);
  await delay(350);
}

async function snapshot(send) {
  return await evaluate(
    send,
    `(() => {
      const visible = (element) => Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
      const text = document.body.innerText;
      return {
        activeNav: [...document.querySelectorAll(".care-nav button.active")].map((button) => button.textContent.trim()),
        buttons: [...document.querySelectorAll("button, a.care-btn")].filter(visible).map((node) => ({ text: node.textContent.trim(), disabled: Boolean(node.disabled) })),
        hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        historyRows: document.querySelectorAll(".care-table tbody tr").length,
        tablePresent: Boolean(document.querySelector(".care-table")),
        drawerPresent: Boolean(document.querySelector(".care-drawer")),
        proofOpen: Boolean(document.querySelector(".care-proof[open]")),
        text,
        trustItems: document.querySelectorAll(".care-trust-grid > div").length,
      };
    })()`,
  );
}

function expectTexts(snapshotValue, texts, label) {
  const visibleText = snapshotValue.text.toLowerCase();
  for (const text of texts) {
    assert(visibleText.includes(text.toLowerCase()), `${label} is missing expected text: ${text}`);
  }
}

async function verifyWorkbench(send) {
  await waitForText(send, "Access dashboard");
  await clickText(send, "Dashboard");
  await waitForText(send, "Search all historical memories");
  await waitForText(send, "Move and breakup context");
  const state = await snapshot(send);
  assert(!state.hasHorizontalOverflow, "Care workbench has horizontal overflow on desktop.");
  assert(state.historyRows >= 6, "Rehearsal workbench should seed a historical table with multiple reflections.");
  assert(state.tablePresent, "Dashboard should render a SaaS-style table.");
  assert(state.drawerPresent, "Dashboard should render a detail drawer.");
  expectTexts(
    state,
    [
      "Local rehearsal",
      "This run uses seeded local proof data only. It does not write to Braga.",
      "Access dashboard",
      "Search memories",
      "Who has access",
      "Write new",
      "Grant memory",
      "Dashboard",
      "Copy care packet",
      "Copy receipt",
      "Share window",
      "Proof details",
    ],
    "Workbench",
  );
  await screenshot(send, desktopWorkbenchShot);
  await clickText(send, "Write new");
}

async function verifyWorkbenchProof(send) {
  await waitForText(send, "Create a private reflection.");
  const state = await snapshot(send);
  assert(!state.hasHorizontalOverflow, "Write view has horizontal overflow on desktop.");
  expectTexts(
    state,
    [
      "Connect wallet",
      "Local wallet",
      "Local key active",
      "Local key",
      "Reflection entry",
      "Reflection type",
      "Event or context",
      "Private-lock this entry",
      "Save encrypted reflection",
      "Reflection preview",
      "Reflection Entry record: 30-day expiry on Braga.",
      "Review access",
    ],
    "Write view",
  );
  await screenshot(send, desktopWriteShot);
  await clickText(send, "Save encrypted reflection");
  await waitForText(send, "Memory saved");
  await waitForText(send, "Grant memory to therapist");
  await clickText(send, "Grant memory to therapist");
}

async function verifyGrant(send) {
  await waitForText(send, "Choose who can see this.");
  const state = await snapshot(send);
  assert(!state.hasHorizontalOverflow, "Grant view has horizontal overflow on desktop.");
  expectTexts(
    state,
    [
      "Share access",
      "Connect wallet",
      "Local wallet",
      "Share details",
      "Share memories from",
      "Recipient wallet",
      "Audience",
      "AI agent context",
      "Therapist raw data",
      "Included memories",
      "Grant action highlighted below",
      "Create access grant",
      "Access summary",
      "Privacy boundary",
      "Review dashboard",
    ],
    "Grant view",
  );
  await screenshot(send, desktopGrantShot);
  await clickText(send, "Create access grant");
  await waitForText(send, "Access dashboard");
}

async function verifyProof(send) {
  await waitForText(send, "Access dashboard");
  await waitForText(send, "Search all historical memories");
  await clickText(send, "Proof details");
  const proofState = await snapshot(send);
  assert(proofState.proofOpen, "Proof details did not expand.");
  expectTexts(
    proofState,
    [
      "local rehearsal - no Braga write",
      "Project scope",
      "Share window",
      "Access grants",
      "This proof was created locally for rehearsal. It was not written to Braga.",
    ],
    "Proof details",
  );
}

async function verifyMobile(send) {
  await setViewport(send, 390, 844, true);
  await navigate(send, appUrl);
  await waitForText(send, "Access dashboard");
  await clickText(send, "Dashboard");
  await waitForText(send, "Search all historical memories");
  await waitForText(send, "Move and breakup context");
  const state = await snapshot(send);
  assert(!state.hasHorizontalOverflow, "Care workbench has horizontal overflow on mobile.");
  expectTexts(state, ["Local rehearsal", "Access dashboard", "Copy care packet", "Who has access", "Write new", "Grant memory", "Dashboard"], "Mobile workbench");
  await screenshot(send, mobileWorkbenchShot);
}

async function main() {
  const { close, getErrors, send } = await connectToPage();

  try {
    await setViewport(send, 1440, 1000);
    await navigate(send, appUrl);
    await verifyWorkbench(send);
    await verifyWorkbenchProof(send);
    await verifyGrant(send);
    await verifyMobile(send);

    const consoleErrors = getErrors().filter((error) => !/favicon/i.test(error));
    assert(consoleErrors.length === 0, `Browser console/log errors found:\n${consoleErrors.join("\n")}`);

    console.log("Care Passport rehearsal verified.");
    console.log(`Screenshots:\n- ${desktopWorkbenchShot}\n- ${desktopWriteShot}\n- ${desktopGrantShot}\n- ${mobileWorkbenchShot}`);
  } finally {
    close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
