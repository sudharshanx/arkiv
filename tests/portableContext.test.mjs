import assert from "node:assert/strict";
import test from "node:test";

import { buildPortableContext } from "../.tmp/test-dist/lib/portableContext.js";

const envelope = {
  schemaVersion: 1,
  algorithm: "AES-GCM",
  keyDerivation: "PBKDF2-SHA256",
  iterations: 210000,
  salt: "",
  iv: "",
  ciphertext: "demo",
  createdAt: 1,
};

test("buildPortableContext exports selected memories as user-visible agent context", () => {
  const context = buildPortableContext(
    [
      {
        entityKey: "note-alpha-12345",
        vaultKey: "space-1",
        owner: "0xDemo",
        status: "active",
        createdAt: 1,
        updatedAt: 2,
        contentClass: "instruction",
        envelope,
        decrypted: {
          title: "Coding style",
          body: "Prefer TypeScript, small modules, and concise comments.",
          tags: ["coding", "preference"],
          memoryType: "instruction",
        },
      },
      {
        entityKey: "note-beta-67890",
        vaultKey: "space-1",
        owner: "0xDemo",
        status: "active",
        createdAt: 1,
        updatedAt: 2,
        contentClass: "fact",
        envelope,
      },
    ],
    [
      {
        entityKey: "link-1",
        vaultKey: "space-1",
        sourceNoteKey: "note-alpha-12345",
        targetNoteKey: "note-gamma-99999",
        relationshipType: "source_for",
        owner: "0xDemo",
        createdAt: 3,
      },
    ],
  );

  assert.match(context, /Use these user-owned memories as context for this session only\./);
  assert.match(context, /Selected memories:/);
  assert.match(context, /- Coding style: Prefer TypeScript, small modules, and concise comments\./);
  assert.match(context, /Tags: coding, preference\./);
  assert.match(context, /Prefer TypeScript, small modules, and concise comments\./);
  assert.match(context, /Related records: source_for note-gamma\.\.\./);
  assert.match(context, /Source records:/);
  assert.match(context, /- Entity: note-alpha-12345/);
  assert.doesNotMatch(context, /note-beta-67890/);
});

test("buildPortableContext changes wrappers for target agent formats", () => {
  const notes = [
    {
      entityKey: "note-alpha-12345",
      vaultKey: "space-1",
      owner: "0xDemo",
      status: "active",
      createdAt: 1,
      updatedAt: 2,
      contentClass: "instruction",
      envelope,
      decrypted: {
        title: "Coding style",
        body: "Prefer TypeScript, small modules, and concise comments.",
        tags: ["coding"],
        memoryType: "instruction",
      },
    },
  ];

  const chat = buildPortableContext(notes, [], { format: "chat" });
  const coding = buildPortableContext(notes, [], { format: "coding" });
  const brief = buildPortableContext(notes, [], { format: "brief" });

  assert.match(
    chat,
    /For this conversation, use the following user-owned memories as context\. Do not treat them as permanent memory unless I explicitly ask\./,
  );
  assert.match(chat, /Memories:/);
  assert.match(coding, /Project\/user context for this coding session:/);
  assert.match(coding, /Apply this context when making implementation decisions\. Do not persist it outside this session\./);
  assert.match(brief, /Project memory brief:/);
  assert.match(brief, /Relevant context:/);
  assert.match(brief, /Use this as background context for planning, writing, or review\./);

  for (const context of [chat, coding, brief]) {
    assert.match(context, /Prefer TypeScript, small modules, and concise comments\./);
    assert.doesNotMatch(context, /sample|fixture/i);
  }
});

test("buildPortableContext explains the empty selected-memory state", () => {
  assert.equal(
    buildPortableContext([], []),
    "Select at least one memory to create context.",
  );
});
