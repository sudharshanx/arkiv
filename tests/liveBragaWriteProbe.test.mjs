import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const scriptSource = readFileSync(new URL("../scripts/verify-live-braga-write.mjs", import.meta.url), "utf8");
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const normalizedScriptSource = scriptSource.replace(/\s+/g, " ");

test("live Braga write probe sends a real Arkiv entity with explicit Braga nonce", () => {
  assert.equal(packageJson.scripts["verify:live-tx"], "node scripts/verify-live-braga-write.mjs");
  assert.match(normalizedScriptSource, /BRAGA_PRIVATE_KEY is required\./);
  assert.match(normalizedScriptSource, /privateKeyToAccount\(normalizePrivateKey\(process\.env\.BRAGA_PRIVATE_KEY\)\)/);
  assert.match(normalizedScriptSource, /bragaRpc\("eth_getTransactionCount", \[address, "latest"\]\)/);
  assert.match(normalizedScriptSource, /bragaRpc\("eth_getTransactionCount", \[address, "pending"\]\)/);
  assert.match(normalizedScriptSource, /const before = await getNonceState\(account\.address\);/);
  assert.match(normalizedScriptSource, /\.createEntity\(/);
  assert.match(normalizedScriptSource, /kind: "care-passport-live-write-probe"/);
  assert.match(normalizedScriptSource, /nonce: before\.next/);
  assert.match(normalizedScriptSource, /Explorer: \$\{BRAGA_EXPLORER_URL\}\/tx\/\$\{result\.txHash\}/);
});
