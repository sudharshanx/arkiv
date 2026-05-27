import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const normalizedAppSource = appSource.replace(/\s+/g, " ");

test("homepage uses Care Passport positioning copy", () => {
  assert.match(normalizedAppSource, /Care Passport/);
  assert.match(normalizedAppSource, /Write privately\. Share selectively\./);
  assert.match(normalizedAppSource, /Write diaries encrypted forever\. Take them with you\. Share only the parts you choose, without walled gardens\./);
  assert.match(normalizedAppSource, /Care Passport is a private, wallet-owned care system for personal diaries, AI-agent-assisted review, and direct therapist sharing\./);
  assert.match(normalizedAppSource, /Create reflection/);
  assert.match(normalizedAppSource, /Share access/);
  assert.match(normalizedAppSource, /Proof details on demand/);
  assert.match(normalizedAppSource, /Connect\. Create\. Review\. Choose audience\. Share\. Revoke\./);
  assert.match(normalizedAppSource, /Your life context should move with you, but stay under your control/);
});

test("homepage names the concrete Care Passport product surfaces", () => {
  assert.match(normalizedAppSource, /Who has access/);
  assert.match(normalizedAppSource, /14-day access/);
  assert.match(normalizedAppSource, /Privacy boundary/);
  assert.match(normalizedAppSource, /Encrypted forever/);
  assert.match(normalizedAppSource, /Selected context/);
  assert.match(normalizedAppSource, /Raw selected data/);
  assert.match(normalizedAppSource, /Connect\. Create\. Review\. Choose audience\. Share\. Revoke\./);
  assert.match(normalizedAppSource, /Proof details on demand/);
  assert.match(normalizedAppSource, /Revoke anytime/);
});

test("homepage avoids banned positioning copy", () => {
  for (const phrase of [
    "next-gen",
    "seamless",
    "revolutionary",
    "fully private on-chain data",
    "decentralized Obsidian",
    "AI chatbot",
    "HIPAA",
    "diagnosis",
    "Carry your story",
    "Arkiv Context",
  ]) {
    assert.doesNotMatch(appSource, new RegExp(phrase, "i"));
  }
});
