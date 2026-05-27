import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const vercelConfig = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const license = readFileSync(new URL("../LICENSE", import.meta.url), "utf8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const normalizedReadme = readme.replace(/\s+/g, " ");

test("README locks the Care Passport pitch, product promise, and submission status", () => {
  assert.match(readme, /# Care Passport/);
  assert.match(readme, /\*\*AI \+ Privacy hybrid for private care continuity\.\*\*/);
  assert.match(readme, /Care Passport helps people change therapists without starting over by preparing a wallet-owned, therapist-ready care packet they control\./);
  assert.match(readme, /Product promise: user-controlled care context that is owned by the wallet, decrypted locally, verified before use, and shared only through an explicit Access Grant\./);
  assert.match(readme, /Deployed app URL: https:\/\/arkiv-vert\.vercel\.app\/app/);
  assert.match(readme, /GitHub repo: https:\/\/github\.com\/sudharshanx\/arkiv/);
  assert.match(readme, /Challenge form: https:\/\/forms\.arkiv\.network\/ethns-arkiv-challenge/);
  assert.match(readme, /Official rules: https:\/\/github\.com\/Arkiv-Network\/arkiv-ethns-builder-challenge/);
  assert.match(readme, /License: MIT/);
  assert.match(readme, /Team: Sudharshan; add additional team members before submission if needed\./);
  assert.match(readme, /Submit by May 25, 2026 at 23:59 UTC\./);
  assert.match(readme, /Late submissions are not accepted/);
});

test("repo declares an open source license for submission", () => {
  assert.equal(packageJson.license, "MIT");
  assert.match(license, /MIT License/);
  assert.match(license, /Copyright \(c\) 2026 Sudharshan/);
});

test("Vercel serves the app deep link through the Vite SPA entry", () => {
  assert.deepEqual(vercelConfig.rewrites, [
    {
      source: "/app",
      destination: "/",
    },
    {
      source: "/app/(.*)",
      destination: "/",
    },
  ]);
});

test("README documents setup, verification, and demo order", () => {
  for (const command of [
    "npm install",
    "npm run dev",
    "npm run test",
    "npm run typecheck",
    "npm run build",
    "npm run verify:local",
  ]) {
    assert.match(readme, new RegExp(command));
  }

  assert.match(normalizedReadme, /Choose -> Review -> Share -> Expire/);
  assert.match(normalizedReadme, /Write -> Grant -> Workbench/);
  assert.match(normalizedReadme, /Write a wallet-owned Reflection Entry by connecting MetaMask on Braga/);
  assert.match(normalizedReadme, /Review the Access Grant by selecting readable Reflection Entries/);
  assert.match(normalizedReadme, /Copy the Continuity Brief and verified receipt/);
  assert.match(normalizedReadme, /Use `\/app` for the current wallet-owned proof path\./);
  assert.match(normalizedReadme, /Confirm the Diary Space, Reflection Entry, and Access Grant receipts include entity keys and Braga Explorer transaction links\./);
  assert.match(readme, /\/app\?rehearsal=1/);
  assert.match(readme, /without MetaMask, Braga RPC, or Explorer links/);
  assert.match(readme, /Rehearsal is local\/no Braga/);
  assert.ok(
    readme.indexOf("Write a wallet-owned Reflection Entry") <
      readme.indexOf("Review the Access Grant"),
  );
});

test("README mirrors the published judging weights", () => {
  assert.match(readme, /Theme: \*\*AI \+ Privacy hybrid\*\*/);
  assert.match(readme, /Arkiv integration depth: 40%/);
  assert.match(readme, /Functionality: 30%/);
  assert.match(readme, /Design & UX: 20%/);
  assert.match(readme, /Code quality & docs: 10%/);
});

test("README includes an AI and care tool integration snippet", () => {
  assert.match(readme, /## How AI and care tools integrate/);
  assert.match(readme, /const continuityBrief = `PASTE COPIED CARE PASSPORT CONTINUITY BRIEF HERE`;/);
  assert.match(readme, /Do not claim access to Reflection Entries that are not included below\./);
  assert.match(readme, /The AI receives only that copied brief, not the whole wallet/);
  assert.match(readme, /\*\*Continuity Brief\*\*/);
});

test("README explains the Arkiv model and Care Passport privacy boundaries", () => {
  assert.match(readme, /PROJECT_ATTRIBUTE = \{/);
  assert.match(readme, /value: "arkiv-agent-notes-ethns-2026"/);
  assert.match(readme, /Queries use Arkiv protocol owner filtering plus the public `owner` attribute\./);
  assert.match(readme, /UI label: \*\*Diary Space\*\*/);
  assert.match(readme, /UI label: \*\*Reflection Entry\*\*/);
  assert.match(readme, /UI label: \*\*Access Grant\*\*/);
  assert.match(readme, /UI label: \*\*Reflection Relationship\*\*/);

  for (const schemaTerm of ["`vault`", "`encrypted_note`", "`access_grant`", "`memory_link`"]) {
    assert.match(readme, new RegExp(schemaTerm));
  }

  assert.match(readme, /Wallet: owns the Arkiv entity and controls update\/delete permissions\./);
  assert.match(readme, /Passphrase: decrypts the encrypted payload locally in the browser\./);
  assert.match(readme, /Diary Space title and description/);
  assert.match(readme, /Reflection Entry body/);
  assert.match(readme, /Access Grant purpose and selected Reflection Entry keys/);
  assert.match(readme, /Optional relationship note/);
  assert.match(readme, /Do not put secrets in Arkiv attributes\./);
});

test("README names known MVP limitations", () => {
  assert.match(readme, /No AI API or care provider integration is bundled; the app exports a Continuity Brief for external tools\./);
  assert.match(readme, /No local sample mode is shipped in the production app path\./);
  assert.match(readme, /The local rehearsal route is only for outage testing; rehearsal is local\/no Braga and does not create Arkiv entities or real Braga proof\./);
  assert.doesNotMatch(readme, /Demo preview uses local fixture data/);
  assert.match(readme, /Attributes are public by design\./);
  assert.match(readme, /Passphrase recovery is not implemented\./);
  assert.match(readme, /Braga is a testnet, so expirations are short and data should not be treated as permanent\./);
});
