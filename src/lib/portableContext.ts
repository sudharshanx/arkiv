import type { LinkRecord, NoteRecord } from "./types";

export type ContextExportFormat = "generic" | "chat" | "coding" | "brief";

type ContextOptions = {
  format?: ContextExportFormat;
};

const formatCopy: Record<ContextExportFormat, { footer: string; heading: string; intro: string }> = {
  generic: {
    intro: "Use these user-owned memories as context for this session only.",
    heading: "Selected memories:",
    footer: "Do not persist this context unless the user explicitly asks.",
  },
  chat: {
    intro:
      "For this conversation, use the following user-owned memories as context. Do not treat them as permanent memory unless I explicitly ask.",
    heading: "Memories:",
    footer: "Answer normally, but respect the privacy boundary of this one conversation.",
  },
  coding: {
    intro: "Project/user context for this coding session:",
    heading: "Context:",
    footer: "Apply this context when making implementation decisions. Do not persist it outside this session.",
  },
  brief: {
    intro: "Project memory brief:",
    heading: "Relevant context:",
    footer: "Use this as background context for planning, writing, or review.",
  },
};

export function buildPortableContext(
  notes: NoteRecord[],
  links: LinkRecord[],
  options: ContextOptions = {},
): string {
  const format = options.format ?? "generic";
  const selected = notes.filter((note) => note.decrypted);
  if (!selected.length) {
    return "Select at least one memory to create context.";
  }

  const copy = formatCopy[format];
  const memoryLines = selected.map((note) => {
    const related = links.filter(
      (link) => link.sourceNoteKey === note.entityKey || link.targetNoteKey === note.entityKey,
    );
    const relationText = related.length
      ? ` Related records: ${related
          .map((link) => {
            const peer = link.sourceNoteKey === note.entityKey ? link.targetNoteKey : link.sourceNoteKey;
            return `${link.relationshipType} ${peer.slice(0, 10)}...`;
          })
          .join("; ")}`
      : "";
    const tags = note.decrypted?.tags.length ? ` Tags: ${note.decrypted.tags.join(", ")}.` : "";

    return `- ${note.decrypted?.title}: ${note.decrypted?.body}${tags}${relationText}`;
  });
  const sourceLines = selected.map((note) => `- Entity: ${note.entityKey}`);

  return [
    copy.intro,
    copy.heading,
    "",
    ...memoryLines,
    "",
    "Source records:",
    ...sourceLines,
    "",
    copy.footer,
  ].join("\n\n");
}
