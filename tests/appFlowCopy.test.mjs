import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const normalizedAppSource = appSource.replace(/\s+/g, " ");
const normalizedCssSource = cssSource.replace(/\s+/g, " ");

test("Care Passport app uses the concrete wallet -> reflection -> access flow", () => {
  assert.match(normalizedAppSource, /Care Passport/);
  assert.match(normalizedAppSource, /Connect\. Create\. Review\. Choose audience\. Share\. Revoke\./);
  assert.match(normalizedAppSource, /Write new/);
  assert.match(normalizedAppSource, /Grant memory/);
  assert.match(normalizedAppSource, /Dashboard/);
  assert.match(normalizedAppSource, /Connect MetaMask/);
  assert.match(normalizedAppSource, /Encrypted forever/);
  assert.match(normalizedAppSource, /Connect wallet/);
  assert.match(normalizedAppSource, /Create a private reflection\./);
  assert.match(normalizedAppSource, /Choose who can see this\./);
  assert.match(normalizedAppSource, /Access dashboard/);
  assert.match(normalizedAppSource, /Historical memories/);
  assert.match(normalizedAppSource, /Who has access/);
  assert.match(normalizedAppSource, /<th>Access<\/th>/);
  assert.match(normalizedAppSource, /memoryAccessStatus\(note, grants\)/);
  assert.match(normalizedAppSource, /Copy care packet/);
  assert.match(normalizedAppSource, /Revoke access/);
  assert.match(normalizedAppSource, /Review access/);
  assert.match(normalizedAppSource, /Open dashboard/);
  assert.match(normalizedAppSource, /Share memories from/);
  assert.match(normalizedAppSource, /Memory saved/);
  assert.match(normalizedAppSource, /Grant memory to therapist/);
  assert.match(normalizedAppSource, /AI agent context/);
  assert.match(normalizedAppSource, /Therapist raw data/);
  assert.match(normalizedAppSource, /Audience/);
  assert.match(normalizedAppSource, /MetaMask/);
  assert.match(normalizedAppSource, /Unlock private passport/);
  assert.match(normalizedAppSource, /Care Passport passphrase/);
  assert.match(normalizedAppSource, /Readable after passphrase unlock/);
  assert.match(normalizedAppSource, /If this passphrase is lost, private reflections cannot be recovered/);
  assert.match(normalizedAppSource, /Passphrase to PBKDF2-SHA256 to AES-GCM encrypt\/decrypt/);
  assert.doesNotMatch(normalizedAppSource, /Select visible/);
});

test("Care Passport model creates reflections and access grants without dropping Arkiv proof", () => {
  assert.match(normalizedAppSource, /createVaultEntity/);
  assert.match(normalizedAppSource, /createNoteEntity/);
  assert.match(normalizedAppSource, /createAccessGrantEntity/);
  assert.match(normalizedAppSource, /revokeAccessGrantEntity/);
  assert.match(normalizedAppSource, /label: "Revoked", tone: "danger"/);
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
  assert.match(normalizedAppSource, /const displayNotes = rehearsal \? mergeByEntityKey\(demoNotes, activeVaultNotes\)/);
  assert.match(normalizedAppSource, /const displayGrants = rehearsal \? mergeByEntityKey\(demoGrants, grants\)/);
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
  assert.match(
    normalizedAppSource,
    /Only reflections inside the chosen time window are included\. Private-locked entries and older out-of-window entries are not part of this packet\./,
  );
  assert.match(normalizedAppSource, /Source: \$\{note\.entityKey\}/);
  assert.match(normalizedAppSource, /Care Passport care packet/);
  assert.match(normalizedAppSource, /Audience:/);
  assert.match(normalizedAppSource, /Do not treat this as a permanent clinical record/);
  assert.match(normalizedAppSource, /not an AI therapist or medical record system/);
  assert.match(normalizedAppSource, /Private family detail/);
});

test("Care Passport stylesheet implements the supplied dark terminal palette", () => {
  assert.match(cssSource, /GeistMono-Regular\.woff2/);
  assert.match(cssSource, /GeistPixel-Grid\.woff2/);
  assert.match(cssSource, /--bg:\s*#070b12;/);
  assert.match(cssSource, /--surface:\s*#101826;/);
  assert.match(cssSource, /--accent:\s*#38bdf8;/);
  assert.match(normalizedCssSource, /\.care-shell \{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(normalizedCssSource, /\.care-trust-grid \{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/);
  assert.match(cssSource, /\.care-toast/);
});

test("old generic and pre-rename workbench UI is removed from the Care Passport source", () => {
  assert.doesNotMatch(appSource, /Arkiv Context/);
  assert.doesNotMatch(appSource, /Continuity Brief/);
  assert.doesNotMatch(appSource, /Proof Center/);
  assert.doesNotMatch(appSource, /CHATGPT_LOGO_URL|CLAUDE_LOGO_URL/);
  assert.doesNotMatch(cssSource, /\.saas-console/);
  assert.doesNotMatch(cssSource, /\.proof-chain/);
});
