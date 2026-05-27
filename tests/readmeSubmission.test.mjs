import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const vercelConfig = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const license = readFileSync(new URL("../LICENSE", import.meta.url), "utf8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const normalizedReadme = readme.replace(/\s+/g, " ");

test("README locks the Care Passport pitch and product promise", () => {
  assert.match(readme, /# Care Passport/);
  assert.match(readme, /Care Passport helps people keep private care notes, see who has access, and share only what they choose\./);
  assert.match(readme, /Product promise: `Care Passport keeps private care notes encrypted locally, stored on Arkiv, reviewed before sharing, and revocable at any time\.`/);
  assert.match(readme, /Submission status:/);
  assert.match(readme, /Deployed app URL: https:\/\/arkiv-vert\.vercel\.app\/app/);
  assert.match(readme, /GitHub repo: https:\/\/github\.com\/sudharshanx\/arkiv/);
  assert.match(readme, /Challenge form: https:\/\/forms\.arkiv\.network\/ethns-arkiv-challenge/);
  assert.match(readme, /Official rules: https:\/\/github\.com\/Arkiv-Network\/arkiv-ethns-builder-challenge/);
  assert.match(readme, /License: MIT/);
  assert.match(readme, /Team: Sudharshan; add additional team members before submission if needed\./);
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

test("README documents setup, demo order, and the dashboard story", () => {
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

  assert.match(normalizedReadme, /Connect wallet -> Create a private reflection -> Review selected notes -> Choose audience -> Share -> Copy care packet -> Revoke access/);
  assert.match(normalizedReadme, /Open `\/app`\./);
  assert.match(normalizedReadme, /Connect the wallet\./);
  assert.match(normalizedReadme, /Choose audience: AI agent context or therapist raw data\./);
  assert.match(normalizedReadme, /Open `Proof details` only if proof is needed\./);
  assert.match(normalizedReadme, /Create access grant with recipient wallet, notes, and duration\./);
  assert.match(readme, /\/app\?rehearsal=1/);
  assert.match(readme, /local\/no Braga/);
  assert.ok(readme.indexOf("Connect the wallet.") < readme.indexOf("Show who has access."));
});

test("README keeps the narrative concrete and product-first", () => {
  assert.match(readme, /What Care Passport Is/);
  assert.match(readme, /A wallet-owned encrypted diary that stays with the user\./);
  assert.match(readme, /AI-agent-assisted review/);
  assert.match(readme, /A proof-first Arkiv app with encrypted writes and readable receipts\./);
  assert.match(readme, /What It Is Not/);
  assert.doesNotMatch(readme, /Continuity Brief/);
});

test("README includes the AI and care tool integration snippet", () => {
  assert.match(readme, /## AI And Care Tool Integration/);
  assert.match(readme, /const carePacket = `PASTE COPIED CARE PASSPORT CARE PACKET HERE`;/);
  assert.match(readme, /selected context packet for AI agents and raw selected data for therapists/);
  assert.match(readme, /AI agents receive only the selected context packet; therapists receive the raw selected data export\./);
  assert.doesNotMatch(readme, /Continuity Brief/);
});

test("README explains the Arkiv model and Care Passport privacy boundaries", () => {
  assert.match(readme, /PROJECT_ATTRIBUTE = \{/);
  assert.match(readme, /value: "arkiv-agent-notes-ethns-2026"/);
  assert.match(readme, /UI label: `Diary Space`/);
  assert.match(readme, /UI label: `Reflection Entry`/);
  assert.match(readme, /UI label: `Access Grant`/);
  assert.match(readme, /UI label: `Reflection Relationship`/);

  for (const schemaTerm of ["`vault`", "`encrypted_note`", "`access_grant`", "`memory_link`"]) {
    assert.match(readme, new RegExp(schemaTerm));
  }

  assert.match(readme, /Wallet: owns the Arkiv entity and controls update\/delete permissions\./);
  assert.match(readme, /Passphrase: decrypts the encrypted payload locally in the browser\./);
  assert.match(readme, /Diary Space title and description/);
  assert.match(readme, /Reflection Entry body/);
  assert.match(readme, /Access Grant purpose and selected reflection entry keys/);
  assert.match(readme, /Optional relationship note/);
  assert.match(readme, /Do not put secrets in Arkiv attributes\./);
});

test("README names known MVP limitations", () => {
  assert.match(readme, /No AI API or care provider integration is bundled; the app exports selected packets for AI agents and raw selected data for therapists\./);
  assert.match(readme, /No local sample mode is shipped in the production app path\./);
  assert.match(readme, /The local rehearsal route is only for outage testing; rehearsal is local\/no Braga and does not create Arkiv entities or real Braga proof\./);
  assert.doesNotMatch(readme, /Demo preview uses local fixture data/);
  assert.match(readme, /Attributes are public by design\./);
  assert.match(readme, /Passphrase recovery is not implemented\./);
  assert.match(readme, /Braga is a testnet, so expirations are short and data should not be treated as permanent\./);
});
