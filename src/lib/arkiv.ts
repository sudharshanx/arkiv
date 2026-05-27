import { createPublicClient, createWalletClient, custom, http } from "@arkiv-network/sdk";
import { braga } from "@arkiv-network/sdk/chains";
import { eq } from "@arkiv-network/sdk/query";
import { ExpirationTime, jsonToPayload, toBytes, toHex, toRlp } from "@arkiv-network/sdk/utils";
import { brotliCompressBrowser } from "./brotli";
import type {
  AccessGrantRecord,
  EncryptionEnvelope,
  EntityStatus,
  GrantScope,
  GrantStatus,
  LinkRecord,
  NoteRecord,
  RelationshipType,
  VaultRecord,
} from "./types";

export const PROJECT_ATTRIBUTE = {
  key: "project",
  value: "arkiv-agent-notes-ethns-2026",
} as const;

export const BRAGA_CHAIN_ID_HEX = "0xe0087f86e";
export const BRAGA_RPC_URL = "https://braga.hoodi.arkiv.network/rpc";
export const BRAGA_EXPLORER_URL = "https://explorer.braga.hoodi.arkiv.network/";
export const BRAGA_FAUCET_URL = "https://braga.hoodi.arkiv.network/faucet/";

const ARKIV_ADDRESS = "0x00000000000000000000000000000061726b6976" as const;
const BLOCK_TIME_SECONDS = 2;
const ARKIV_RECEIPT_TIMEOUT_MS = 30_000;
const ARKIV_RECEIPT_POLL_INTERVAL_MS = 2_000;
const ARKIV_WRITE_TX_PARAMS = {
  gas: 5_000_000n,
  maxFeePerGas: 2_000_000n,
  maxPriorityFeePerGas: 1_000_000n,
} as const;

export const publicClient = createPublicClient({
  chain: braga,
  transport: http(),
});

type ArkivEntity = {
  key?: string;
  entityKey?: string;
  attributes?: Array<{ key: string; value: string | number | bigint }>;
  toJson?: () => unknown;
  payload?: unknown;
};

type Hex = `0x${string}`;
type EthereumAddress = `0x${string}`;

type EthereumRpcError = {
  code?: number;
  message?: string;
};

type RawReceiptLog = {
  topics?: string[];
};

type RawTransactionReceipt = {
  logs?: RawReceiptLog[];
  status?: string;
  transactionHash?: string;
};

type ArkivTransactionReceipt = {
  logs: Array<{ topics: string[] }>;
  status: "success" | "reverted";
  transactionHash: string;
};

type CreateEntityInput = {
  payload: Uint8Array;
  attributes: Array<{ key: string; value: string | number | bigint | boolean }>;
  contentType: string;
  expiresIn: number;
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function getAttribute(entity: ArkivEntity, key: string): string | number | bigint | undefined {
  return entity.attributes?.find((attribute) => attribute.key === key)?.value;
}

function readPayload(entity: ArkivEntity): unknown {
  if (typeof entity.toJson === "function") {
    return entity.toJson();
  }
  return entity.payload;
}

function assertEnvelope(value: unknown): EncryptionEnvelope {
  if (!value || typeof value !== "object") {
    throw new Error("Entity payload is not an encryption envelope.");
  }

  const envelope = value as Partial<EncryptionEnvelope>;
  if (
    envelope.schemaVersion !== 1 ||
    envelope.algorithm !== "AES-GCM" ||
    typeof envelope.ciphertext !== "string"
  ) {
    throw new Error("Entity payload uses an unsupported encryption envelope.");
  }

  return envelope as EncryptionEnvelope;
}

function entityKey(entity: ArkivEntity): string {
  return entity.key ?? entity.entityKey ?? "";
}

function isMissingChainError(error: unknown): boolean {
  const rpcError = error as EthereumRpcError;
  const message = rpcError?.message?.toLowerCase() ?? "";
  return rpcError?.code === 4902 || message.includes("unrecognized chain") || message.includes("not added");
}

async function assertBrowserOnBraga(): Promise<void> {
  if (!window.ethereum) {
    throw new Error("MetaMask or another browser wallet is required for writes.");
  }

  const chainId = (await window.ethereum.request({ method: "eth_chainId" })) as string;
  if (chainId.toLowerCase() !== BRAGA_CHAIN_ID_HEX) {
    throw new Error("MetaMask did not switch to Arkiv Braga Testnet. Open MetaMask, select Arkiv Braga Testnet, and retry.");
  }
}

function grantExpiresIn(expiresAt: number): number {
  if (!Number.isFinite(expiresAt)) {
    throw new Error("Grant expiration must be a valid timestamp.");
  }

  return Math.max(ExpirationTime.fromDate(new Date(expiresAt)), BLOCK_TIME_SECONDS);
}

export async function ensureBragaNetwork(): Promise<void> {
  if (!window.ethereum) {
    throw new Error("MetaMask or another browser wallet is required for writes.");
  }

  const chainParams = {
    chainId: BRAGA_CHAIN_ID_HEX,
    chainName: "Arkiv Braga Testnet",
    nativeCurrency: {
      name: "Golem",
      symbol: "GLM",
      decimals: 18,
    },
    rpcUrls: [BRAGA_RPC_URL],
    blockExplorerUrls: [BRAGA_EXPLORER_URL],
  };

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BRAGA_CHAIN_ID_HEX }],
    });
  } catch (error) {
    if (!isMissingChainError(error)) {
      throw error;
    }

    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [chainParams],
    });
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BRAGA_CHAIN_ID_HEX }],
    });
  }

  await assertBrowserOnBraga();
}

export async function connectWallet(): Promise<string> {
  if (!window.ethereum) {
    throw new Error("Install MetaMask or another EIP-1193 browser wallet.");
  }

  await ensureBragaNetwork();
  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];

  if (!accounts[0]) {
    throw new Error("No wallet account was returned.");
  }

  return accounts[0];
}

function getWalletClient(ownerAddress: string) {
  if (!window.ethereum) {
    throw new Error("Install MetaMask or another EIP-1193 browser wallet.");
  }

  return createWalletClient({
    chain: braga,
    transport: custom(window.ethereum),
    account: ownerAddress as EthereumAddress,
  });
}

function formatAttribute<T extends string | number | bigint | boolean>(attribute: {
  key: string;
  value: T;
}): [Hex, Hex] {
  return [
    toHex(attribute.key) as Hex,
    toHex(typeof attribute.value === "number" && attribute.value === 0 ? "" : attribute.value) as Hex,
  ];
}

function entityToTxData(entity: CreateEntityInput): Hex {
  return toRlp([
    [
      [
        toHex(Math.ceil(entity.expiresIn / BLOCK_TIME_SECONDS)),
        toHex(entity.contentType),
        toHex(entity.payload),
        entity.attributes.filter((attribute) => typeof attribute.value === "string").map(formatAttribute),
        entity.attributes.filter((attribute) => typeof attribute.value === "number").map(formatAttribute),
      ],
    ],
    [],
    [],
    [],
    [],
  ]) as Hex;
}

async function compressArkivTxData(data: Hex): Promise<Uint8Array> {
  const raw = toBytes(data);
  const compressed = await brotliCompressBrowser(raw);

  if (compressed.length === 0 || compressed[0] === raw[0]) {
    throw new Error("Brotli compression failed in the browser bundle.");
  }

  return compressed;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function getTransactionReceiptFromRpc(txHash: Hex): Promise<ArkivTransactionReceipt | null> {
  const response = await fetch(BRAGA_RPC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "eth_getTransactionReceipt",
      params: [txHash],
    }),
  });

  if (!response.ok) {
    throw new Error(`Braga RPC receipt check failed with HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as {
    error?: { message?: string };
    result?: RawTransactionReceipt | null;
  };

  if (payload.error) {
    throw new Error(payload.error.message ?? "Braga RPC returned an error while checking the transaction receipt.");
  }

  if (!payload.result) return null;

  return {
    logs: (payload.result.logs ?? []).map((log) => ({ topics: log.topics ?? [] })),
    status: payload.result.status === "0x0" ? "reverted" : "success",
    transactionHash: payload.result.transactionHash ?? txHash,
  };
}

async function waitForTransactionReceiptFromRpc(txHash: Hex): Promise<ArkivTransactionReceipt> {
  const startedAt = Date.now();
  let lastError = "";

  while (Date.now() - startedAt < ARKIV_RECEIPT_TIMEOUT_MS) {
    try {
      const receipt = await getTransactionReceiptFromRpc(txHash);
      if (receipt) return receipt;
    } catch (caught) {
      lastError = caught instanceof Error ? caught.message : "Unknown Braga RPC receipt error.";
    }

    await wait(ARKIV_RECEIPT_POLL_INTERVAL_MS);
  }

  const suffix = lastError ? ` Last RPC error: ${lastError}` : "";
  throw new Error(
    `Timed out waiting for Braga receipt for ${txHash}. The transaction was submitted and may still confirm. Check Braga Explorer, then try loading wallet records again.${suffix}`,
  );
}

async function createEntityWithBrowserBrotli(
  ownerAddress: string,
  entity: CreateEntityInput,
  options: { onTransactionSubmitted?: (txHash: string) => void } = {},
): Promise<{ entityKey: string; txHash?: string }> {
  await ensureBragaNetwork();
  const walletClient = getWalletClient(ownerAddress);
  const compressed = await compressArkivTxData(entityToTxData(entity));
  const txHash = await walletClient.sendTransaction({
    account: ownerAddress as EthereumAddress,
    chain: braga,
    to: ARKIV_ADDRESS,
    value: 0n,
    data: toHex(compressed),
    ...ARKIV_WRITE_TX_PARAMS,
  });
  options.onTransactionSubmitted?.(txHash);
  const receipt = await waitForTransactionReceiptFromRpc(txHash);

  if (receipt.status === "reverted") {
    throw new Error(`Arkiv transaction reverted: ${receipt.transactionHash}`);
  }

  const entityKey = receipt.logs[0]?.topics[1];
  if (!entityKey) {
    throw new Error(`Arkiv transaction confirmed but did not return an entity key: ${receipt.transactionHash}`);
  }

  return {
    txHash: receipt.transactionHash,
    entityKey,
  };
}

export async function createVaultEntity(params: {
  owner: string;
  envelope: EncryptionEnvelope;
  onTransactionSubmitted?: (txHash: string) => void;
}): Promise<{ entityKey: string; txHash?: string }> {
  const now = Date.now();
  const result = await createEntityWithBrowserBrotli(
    params.owner,
    {
      payload: jsonToPayload(params.envelope),
      contentType: "application/json",
      attributes: [
        PROJECT_ATTRIBUTE,
        { key: "entityType", value: "vault" },
        { key: "schemaVersion", value: 1 },
        { key: "owner", value: params.owner.toLowerCase() },
        { key: "status", value: "active" },
        { key: "createdAt", value: now },
        { key: "updatedAt", value: now },
      ],
      expiresIn: ExpirationTime.fromDays(90),
    },
    { onTransactionSubmitted: params.onTransactionSubmitted },
  );

  return result;
}

export async function createNoteEntity(params: {
  owner: string;
  vaultKey: string;
  contentClass: string;
  envelope: EncryptionEnvelope;
  onTransactionSubmitted?: (txHash: string) => void;
}): Promise<{ entityKey: string; txHash?: string }> {
  const now = Date.now();
  const result = await createEntityWithBrowserBrotli(
    params.owner,
    {
      payload: jsonToPayload(params.envelope),
      contentType: "application/json",
      attributes: [
        PROJECT_ATTRIBUTE,
        { key: "entityType", value: "encrypted_note" },
        { key: "schemaVersion", value: 1 },
        { key: "vaultKey", value: params.vaultKey },
        { key: "owner", value: params.owner.toLowerCase() },
        { key: "status", value: "active" },
        { key: "contentClass", value: params.contentClass },
        { key: "createdAt", value: now },
        { key: "updatedAt", value: now },
      ],
      expiresIn: ExpirationTime.fromDays(30),
    },
    { onTransactionSubmitted: params.onTransactionSubmitted },
  );

  return result;
}

export async function createLinkEntity(params: {
  owner: string;
  vaultKey: string;
  sourceNoteKey: string;
  targetNoteKey: string;
  relationshipType: RelationshipType;
  envelope?: EncryptionEnvelope;
  onTransactionSubmitted?: (txHash: string) => void;
}): Promise<{ entityKey: string; txHash?: string }> {
  const now = Date.now();
  const result = await createEntityWithBrowserBrotli(
    params.owner,
    {
      payload: jsonToPayload(
        params.envelope ?? {
          schemaVersion: 1,
          relationshipType: params.relationshipType,
        },
      ),
      contentType: "application/json",
      attributes: [
        PROJECT_ATTRIBUTE,
        { key: "entityType", value: "memory_link" },
        { key: "schemaVersion", value: 1 },
        { key: "vaultKey", value: params.vaultKey },
        { key: "sourceNoteKey", value: params.sourceNoteKey },
        { key: "targetNoteKey", value: params.targetNoteKey },
        { key: "relationshipType", value: params.relationshipType },
        { key: "owner", value: params.owner.toLowerCase() },
        { key: "createdAt", value: now },
      ],
      expiresIn: ExpirationTime.fromDays(30),
    },
    { onTransactionSubmitted: params.onTransactionSubmitted },
  );

  return result;
}

export async function createAccessGrantEntity(params: {
  owner: string;
  vaultKey: string;
  therapistWallet: string;
  scope: GrantScope;
  status?: GrantStatus;
  expiresAt: number;
  envelope: EncryptionEnvelope;
  onTransactionSubmitted?: (txHash: string) => void;
}): Promise<{ entityKey: string; txHash?: string }> {
  const now = Date.now();
  const result = await createEntityWithBrowserBrotli(
    params.owner,
    {
      payload: jsonToPayload(params.envelope),
      contentType: "application/json",
      attributes: [
        PROJECT_ATTRIBUTE,
        { key: "entityType", value: "access_grant" },
        { key: "schemaVersion", value: 1 },
        { key: "owner", value: params.owner.toLowerCase() },
        { key: "vaultKey", value: params.vaultKey },
        { key: "therapistWallet", value: params.therapistWallet.toLowerCase() },
        { key: "scope", value: params.scope },
        { key: "status", value: params.status ?? "active" },
        { key: "createdAt", value: now },
        { key: "expiresAt", value: params.expiresAt },
      ],
      expiresIn: grantExpiresIn(params.expiresAt),
    },
    { onTransactionSubmitted: params.onTransactionSubmitted },
  );

  return result;
}

export async function fetchVaults(owner: string): Promise<VaultRecord[]> {
  const ownerAddress = owner as EthereumAddress;
  const result = await publicClient
    .buildQuery()
    .where([
      eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
      eq("entityType", "vault"),
      eq("owner", owner.toLowerCase()),
    ])
    .ownedBy(ownerAddress)
    .withPayload(true)
    .withAttributes(true)
    .limit(50)
    .fetch();

  return (result.entities as ArkivEntity[])
    .map((entity) => ({
      entityKey: entityKey(entity),
      owner: asString(getAttribute(entity, "owner")),
      status: asString(getAttribute(entity, "status"), "active") as EntityStatus,
      createdAt: asNumber(getAttribute(entity, "createdAt")),
      updatedAt: asNumber(getAttribute(entity, "updatedAt")),
      envelope: assertEnvelope(readPayload(entity)),
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function fetchNotes(owner: string, vaultKey: string): Promise<NoteRecord[]> {
  const ownerAddress = owner as EthereumAddress;
  const result = await publicClient
    .buildQuery()
    .where([
      eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
      eq("entityType", "encrypted_note"),
      eq("owner", owner.toLowerCase()),
      eq("vaultKey", vaultKey),
    ])
    .ownedBy(ownerAddress)
    .withPayload(true)
    .withAttributes(true)
    .limit(100)
    .fetch();

  return (result.entities as ArkivEntity[])
    .map((entity) => ({
      entityKey: entityKey(entity),
      vaultKey: asString(getAttribute(entity, "vaultKey")),
      owner: asString(getAttribute(entity, "owner")),
      status: asString(getAttribute(entity, "status"), "active") as EntityStatus,
      createdAt: asNumber(getAttribute(entity, "createdAt")),
      updatedAt: asNumber(getAttribute(entity, "updatedAt")),
      contentClass: asString(getAttribute(entity, "contentClass"), "note"),
      envelope: assertEnvelope(readPayload(entity)),
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function fetchLinks(owner: string, vaultKey: string): Promise<LinkRecord[]> {
  const ownerAddress = owner as EthereumAddress;
  const result = await publicClient
    .buildQuery()
    .where([
      eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
      eq("entityType", "memory_link"),
      eq("owner", owner.toLowerCase()),
      eq("vaultKey", vaultKey),
    ])
    .ownedBy(ownerAddress)
    .withPayload(true)
    .withAttributes(true)
    .limit(100)
    .fetch();

  return (result.entities as ArkivEntity[])
    .map((entity) => {
      const payload = readPayload(entity);
      const envelope =
        payload && typeof payload === "object" && (payload as Partial<EncryptionEnvelope>).algorithm === "AES-GCM"
          ? assertEnvelope(payload)
          : undefined;

      return {
        entityKey: entityKey(entity),
        vaultKey: asString(getAttribute(entity, "vaultKey")),
        sourceNoteKey: asString(getAttribute(entity, "sourceNoteKey")),
        targetNoteKey: asString(getAttribute(entity, "targetNoteKey")),
        relationshipType: asString(getAttribute(entity, "relationshipType"), "related_to") as RelationshipType,
        owner: asString(getAttribute(entity, "owner")),
        createdAt: asNumber(getAttribute(entity, "createdAt")),
        envelope,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function fetchAccessGrants(owner: string, vaultKey: string): Promise<AccessGrantRecord[]> {
  const ownerAddress = owner as EthereumAddress;
  const result = await publicClient
    .buildQuery()
    .where([
      eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
      eq("entityType", "access_grant"),
      eq("owner", owner.toLowerCase()),
      eq("vaultKey", vaultKey),
    ])
    .ownedBy(ownerAddress)
    .withPayload(true)
    .withAttributes(true)
    .limit(100)
    .fetch();

  return (result.entities as ArkivEntity[])
    .map((entity) => ({
      entityKey: entityKey(entity),
      vaultKey: asString(getAttribute(entity, "vaultKey")),
      owner: asString(getAttribute(entity, "owner")),
      therapistWallet: asString(getAttribute(entity, "therapistWallet")),
      scope: asString(getAttribute(entity, "scope"), "selected_packet") as GrantScope,
      status: asString(getAttribute(entity, "status"), "active") as GrantStatus,
      createdAt: asNumber(getAttribute(entity, "createdAt")),
      expiresAt: asNumber(getAttribute(entity, "expiresAt")),
      envelope: assertEnvelope(readPayload(entity)),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}
