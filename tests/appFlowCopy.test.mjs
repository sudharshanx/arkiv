import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const normalizedAppSource = appSource.replace(/\s+/g, " ");
const normalizedCssSource = cssSource.replace(/\s+/g, " ");

test("Care Passport app uses the Choose -> Review -> Share -> Expire workflow", () => {
  assert.match(normalizedAppSource, /Care Passport/);
  assert.match(normalizedAppSource, /Choose\. Review\. Share\. Expire\./);
  assert.match(normalizedAppSource, /Write \/ protect/);
  assert.match(normalizedAppSource, /Grant \/ consent review/);
  assert.match(normalizedAppSource, /Prepare a therapist-ready care packet\./);
  assert.match(normalizedAppSource, /Care packet review/);
  assert.match(normalizedAppSource, /Care Passport continuity packet/);
  assert.match(normalizedAppSource, /Create a private reflection\./);
  assert.match(normalizedAppSource, /Copy care packet/);
});

test("Care Passport model creates reflections and access grants without dropping Arkiv proof", () => {
  assert.match(normalizedAppSource, /createVaultEntity/);
  assert.match(normalizedAppSource, /createNoteEntity/);
  assert.match(normalizedAppSource, /createAccessGrantEntity/);
  assert.match(normalizedAppSource, /fetchAccessGrants/);
  assert.match(normalizedAppSource, /PROJECT_ATTRIBUTE/);
  assert.match(normalizedAppSource, /Diary Space record: 90-day expiry on Braga\./);
  assert.match(normalizedAppSource, /Reflection Entry record: 30-day expiry on Braga\./);
  assert.match(normalizedAppSource, /Access grant confirmed on Braga\./);
  assert.match(normalizedAppSource, /Open Braga Explorer/);
});

test("wallet switch cannot reuse another wallet's diary space", () => {
  assert.match(normalizedAppSource, /function normalizeAddress\(address: string\)/);
  assert.match(
    normalizedAppSource,
    /const walletVaults = walletOwner \? vaults\.filter\(\(vault\) => normalizeAddress\(vault\.owner\) === walletOwner\) : \[\];/,
  );
  assert.match(normalizedAppSource, /if \(normalizeAddress\(account\) !== walletOwner\) \{ resetWalletScopedState\(\); \}/);
  assert.match(
    normalizedAppSource,
    /if \(activeVault && normalizeAddress\(activeVault\.owner\) === walletOwner\) return activeVault;/,
  );
});

test("rehearsal mode is seeded, local, and never claims Braga writes", () => {
  assert.match(normalizedAppSource, /isLocalRehearsalMode/);
  assert.match(normalizedAppSource, /Seeded local rehearsal diary space\. No Arkiv transaction was sent\./);
  assert.match(normalizedAppSource, /Seeded encrypted local reflections\. No Arkiv transaction was sent\./);
  assert.match(normalizedAppSource, /Seeded local therapist grant\. No Arkiv transaction was sent\./);
  assert.match(normalizedAppSource, /This run uses seeded local proof data only\. It does not write to Braga\./);
  assert.match(normalizedAppSource, /local rehearsal - no Braga write/);
  assert.match(normalizedAppSource, /This proof was created locally for rehearsal\. It was not written to Braga\./);
});

test("continuity packet includes only selected non-private reflections", () => {
  assert.match(normalizedAppSource, /privateLocked/);
  assert.match(normalizedAppSource, /non-private-locked reflection/);
  assert.match(normalizedAppSource, /Only selected Reflection Entries are included\. Private-locked entries and unselected entries are not part of this packet\./);
  assert.match(normalizedAppSource, /Source: \$\{note\.entityKey\}/);
  assert.match(normalizedAppSource, /Only selected reflections were included\./);
  assert.match(normalizedAppSource, /Do not treat this as a permanent clinical record/);
  assert.match(normalizedAppSource, /not an AI therapist or medical record system/);
  assert.match(normalizedAppSource, /Private family detail/);
});

test("Care Passport stylesheet implements the supplied dark care palette", () => {
  assert.match(cssSource, /GeistMono-Regular\.woff2/);
  assert.match(cssSource, /GeistPixel-Grid\.woff2/);
  assert.match(cssSource, /--bg:\s*#06100d;/);
  assert.match(cssSource, /--surface:\s*#0f1b17;/);
  assert.match(cssSource, /--accent:\s*#5eead4;/);
  assert.match(normalizedCssSource, /\.care-workspace \{[^}]*grid-template-columns: minmax\(300px, 360px\) minmax\(0, 1fr\);/);
  assert.match(normalizedCssSource, /\.care-trust-grid \{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/);
  assert.match(cssSource, /\.care-toast/);
});

test("old generic and pre-rename workbench UI is removed from the Care Passport source", () => {
  assert.doesNotMatch(appSource, /Use verified memory in an agent/);
  assert.doesNotMatch(appSource, /Copy for agent/);
  assert.doesNotMatch(appSource, /Proof Center/);
  assert.doesNotMatch(appSource, /CHATGPT_LOGO_URL|CLAUDE_LOGO_URL/);
  assert.doesNotMatch(appSource, /Arkiv Context/);
  assert.doesNotMatch(appSource, /Therapist handoff packet/);
  assert.doesNotMatch(appSource, /Carry your story/);
  assert.doesNotMatch(cssSource, /\.saas-console/);
  assert.doesNotMatch(cssSource, /\.proof-chain/);
});
