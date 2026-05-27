import type { EncryptionEnvelope } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ITERATIONS = 210_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const stableSalt = new Uint8Array(salt);
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: stableSalt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptJson<T>(value: T, passphrase: string): Promise<EncryptionEnvelope> {
  if (!passphrase.trim()) {
    throw new Error("Enter a passphrase before encrypting.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const plaintext = encoder.encode(JSON.stringify(value));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);

  return {
    schemaVersion: 1,
    algorithm: "AES-GCM",
    keyDerivation: "PBKDF2-SHA256",
    iterations: ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    createdAt: Date.now(),
  };
}

export async function decryptJson<T>(envelope: EncryptionEnvelope, passphrase: string): Promise<T> {
  if (!passphrase.trim()) {
    throw new Error("Enter a passphrase before decrypting.");
  }

  const salt = base64ToBytes(envelope.salt);
  const iv = base64ToBytes(envelope.iv);
  const ciphertext = base64ToBytes(envelope.ciphertext);
  const key = await deriveKey(passphrase, salt);

  try {
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, key, new Uint8Array(ciphertext));
    return JSON.parse(decoder.decode(decrypted)) as T;
  } catch {
    throw new Error("Could not decrypt. Check your passphrase.");
  }
}
