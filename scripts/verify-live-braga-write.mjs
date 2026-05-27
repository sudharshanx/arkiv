import { createWalletClient, http } from "@arkiv-network/sdk";
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts";
import { braga } from "@arkiv-network/sdk/chains";
import { ExpirationTime, jsonToPayload } from "@arkiv-network/sdk/utils";

const BRAGA_RPC_URL = "https://braga.hoodi.arkiv.network/rpc";
const BRAGA_EXPLORER_URL = "https://explorer.braga.hoodi.arkiv.network";
const PROJECT_ATTRIBUTE = {
  key: "project",
  value: "arkiv-agent-notes-ethns-2026",
};
const TX_PARAMS = {
  gas: 5_000_000n,
  maxFeePerGas: 2_000_000n,
  maxPriorityFeePerGas: 1_000_000n,
};

function normalizePrivateKey(value) {
  const trimmed = value.trim();
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

function hexToSafeNumber(value) {
  const parsed = Number(BigInt(value));
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`RPC number is outside JavaScript's safe integer range: ${value}`);
  }
  return parsed;
}

async function bragaRpc(method, params) {
  const response = await fetch(BRAGA_RPC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`Braga RPC ${method} failed with HTTP ${response.status}.`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.error.message || `Braga RPC ${method} returned an error.`);
  }

  return payload.result;
}

async function getNonceState(address) {
  const [latestHex, pendingHex] = await Promise.all([
    bragaRpc("eth_getTransactionCount", [address, "latest"]),
    bragaRpc("eth_getTransactionCount", [address, "pending"]),
  ]);
  const latest = hexToSafeNumber(latestHex);
  const pending = hexToSafeNumber(pendingHex);

  return {
    latest,
    pending,
    next: Math.max(latest, pending),
  };
}

async function main() {
  if (!process.env.BRAGA_PRIVATE_KEY) {
    throw new Error(
      [
        "BRAGA_PRIVATE_KEY is required.",
        "Use a disposable Arkiv Braga testnet wallet funded with faucet GLM.",
        "Example:",
        "  BRAGA_PRIVATE_KEY=0x... npm run verify:live-tx",
      ].join("\n"),
    );
  }

  const account = privateKeyToAccount(normalizePrivateKey(process.env.BRAGA_PRIVATE_KEY));
  const before = await getNonceState(account.address);

  console.log(`Using disposable Braga account ${account.address}`);
  console.log(`Nonce before send: latest=${before.latest}, pending=${before.pending}, selected=${before.next}`);

  const client = createWalletClient({
    account,
    chain: braga,
    transport: http(BRAGA_RPC_URL),
  });

  const now = Date.now();
  const result = await client.createEntity(
    {
      payload: jsonToPayload({
        createdAt: now,
        kind: "care-passport-live-write-probe",
        selectedNonce: before.next,
      }),
      contentType: "application/json",
      attributes: [
        PROJECT_ATTRIBUTE,
        { key: "entityType", value: "live_write_probe" },
        { key: "owner", value: account.address.toLowerCase() },
        { key: "createdAt", value: now },
      ],
      expiresIn: ExpirationTime.fromHours(1),
    },
    {
      ...TX_PARAMS,
      nonce: before.next,
    },
  );

  const after = await getNonceState(account.address);
  console.log(`Transaction: ${result.txHash}`);
  console.log(`Explorer: ${BRAGA_EXPLORER_URL}/tx/${result.txHash}`);
  console.log(`Entity: ${result.entityKey}`);
  console.log(`Nonce after send: latest=${after.latest}, pending=${after.pending}, selected=${after.next}`);

  if (after.latest <= before.latest) {
    throw new Error("Transaction returned from createEntity, but latest nonce did not increase.");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
