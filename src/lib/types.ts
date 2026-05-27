export type EntityStatus = "active" | "archived";

export type RelationshipType = "related_to" | "source_for" | "follow_up" | "contradicts";

export type CareReflectionType =
  | "life_event"
  | "emotion_pattern"
  | "trigger"
  | "coping_pattern"
  | "therapy_goal"
  | "relationship_context"
  | "personal_preference";

export type GrantScope = "selected_packet" | "temporary_full_view";

export type GrantStatus = "active" | "revoked" | "expired";

export type EncryptionEnvelope = {
  schemaVersion: 1;
  algorithm: "AES-GCM";
  keyDerivation: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  createdAt: number;
};

export type VaultSecret = {
  title: string;
  description: string;
};

export type NoteSecret = {
  title: string;
  body: string;
  tags: string[];
  memoryType: "preference" | "fact" | "instruction" | "scratchpad" | CareReflectionType;
  eventContext?: string;
  feeling?: string;
  triggerPattern?: string;
  whatHelped?: string;
  rememberNextSession?: string;
  privateLocked?: boolean;
};

export type LinkSecret = {
  note: string;
};

export type GrantSecret = {
  purpose: string;
  includedNoteKeys: string[];
  notes?: string;
};

export type VaultRecord = {
  entityKey: string;
  owner: string;
  status: EntityStatus;
  createdAt: number;
  updatedAt: number;
  envelope: EncryptionEnvelope;
  decrypted?: VaultSecret;
};

export type NoteRecord = {
  entityKey: string;
  vaultKey: string;
  owner: string;
  status: EntityStatus;
  createdAt: number;
  updatedAt: number;
  contentClass: string;
  envelope: EncryptionEnvelope;
  decrypted?: NoteSecret;
};

export type LinkRecord = {
  entityKey: string;
  vaultKey: string;
  sourceNoteKey: string;
  targetNoteKey: string;
  relationshipType: RelationshipType;
  owner: string;
  createdAt: number;
  envelope?: EncryptionEnvelope;
  decrypted?: LinkSecret;
};

export type AccessGrantRecord = {
  entityKey: string;
  vaultKey: string;
  owner: string;
  therapistWallet: string;
  scope: GrantScope;
  status: GrantStatus;
  createdAt: number;
  expiresAt: number;
  envelope: EncryptionEnvelope;
  decrypted?: GrantSecret;
};

export type DraftNote = {
  title: string;
  body: string;
  tags: string;
  memoryType: NoteSecret["memoryType"];
  eventContext?: string;
  feeling?: string;
  triggerPattern?: string;
  whatHelped?: string;
  rememberNextSession?: string;
  privateLocked?: boolean;
};

export type DraftGrant = {
  therapistWallet: string;
  purpose: string;
  scope: GrantScope;
  expiresAt: number;
  includedNoteKeys: string[];
};
