import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const normalizedAppSource = appSource.replace(/\s+/g, " ");

test("homepage uses Care Passport positioning copy", () => {
  assert.match(normalizedAppSource, /Care Passport/);
  assert.match(normalizedAppSource, /Change therapists without starting over\./);
  assert.match(
    normalizedAppSource,
    /Care Passport prepares a therapist-ready care packet you control: choose the reflections, review what is included, grant time-bound access, and copy only the context you approve\./,
  );
  assert.match(normalizedAppSource, /Care Passport is not an AI therapist or a medical record system\./);
  assert.match(normalizedAppSource, /Prepare handoff/);
  assert.match(normalizedAppSource, /Write reflection/);
  assert.match(normalizedAppSource, /Private diary content is encrypted locally/);
  assert.match(normalizedAppSource, /Choose\. Review\. Share\. Expire\./);
  assert.match(normalizedAppSource, /Your care context moves with you, under your control/);
});

test("homepage names the concrete Care Passport product surfaces", () => {
  assert.match(normalizedAppSource, /Therapist-ready care packet/);
  assert.match(normalizedAppSource, /Structured Reflection Entries/);
  assert.match(normalizedAppSource, /Consent before sharing/);
  assert.match(normalizedAppSource, /Continuity Brief/);
  assert.match(normalizedAppSource, /14-day care grant/);
  assert.match(normalizedAppSource, /Proof visible on demand/);
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
  ]) {
    assert.doesNotMatch(appSource, new RegExp(phrase, "i"));
  }
});
