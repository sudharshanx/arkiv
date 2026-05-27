import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const arkivSource = readFileSync(new URL("../src/lib/arkiv.ts", import.meta.url), "utf8");
const normalizedArkivSource = arkivSource.replace(/\s+/g, " ");

test("Arkiv wallet writes create a wallet client with the connected owner account", () => {
  assert.match(normalizedArkivSource, /const ARKIV_WRITE_TX_PARAMS = \{ gas: 5_000_000n, maxFeePerGas: 2_000_000n, maxPriorityFeePerGas: 1_000_000n, \} as const;/);
  assert.match(
    normalizedArkivSource,
    /import \{ brotliCompressBrowser \} from "\.\/brotli";/,
    "browser writes must use the browser Brotli wrapper before submitting Arkiv calldata",
  );
  assert.match(
    normalizedArkivSource,
    /async function compressArkivTxData\(data: Hex\).*await brotliCompressBrowser\(raw\)/,
    "Arkiv writes must Brotli-compress transaction data in the browser bundle",
  );

  assert.match(
    normalizedArkivSource,
    /function getWalletClient\(ownerAddress: string\) \{.*createWalletClient\(\{.*chain: braga,.*transport: custom\(window\.ethereum\),.*account: ownerAddress as EthereumAddress,.*\}\);.*\}/,
  );
  assert.match(
    normalizedArkivSource,
    /const nonceState = await getBragaNonceState\(ownerAddress\);.*sendTransaction\(\{.*data: toHex\(compressed\),.*nonce: nonceState\.next,.*\.\.\.ARKIV_WRITE_TX_PARAMS,/,
    "browser-safe Arkiv write helper should use Braga RPC nonce state and explicit transaction fee parameters",
  );
  assert.match(
    normalizedArkivSource,
    /options\.onTransactionSubmitted\?\.\(txHash\); const receipt = await waitForTransactionReceiptFromRpc\(txHash, ownerAddress\)/,
    "browser-safe Arkiv write helper should expose the transaction hash immediately after MetaMask approval, then poll Braga receipt directly",
  );
  assert.match(
    normalizedArkivSource,
    /bragaRpc<RawTransactionReceipt \| null>\("eth_getTransactionReceipt"/,
    "Arkiv writes should use bounded direct receipt polling after MetaMask returns a transaction hash",
  );
  assert.match(
    normalizedArkivSource,
    /bragaRpc<string>\("eth_getTransactionCount"/,
    "Arkiv writes should query Braga's latest and pending nonce before sending",
  );
  assert.match(
    normalizedArkivSource,
    /export function bragaTransactionUrl\(txHash: string\)/,
    "Arkiv write errors should have a direct Braga Explorer transaction URL",
  );
  assert.match(
    normalizedArkivSource,
    /method: "wallet_switchEthereumChain"/,
    "Arkiv writes should explicitly switch MetaMask to Braga instead of only adding the chain",
  );
  assert.match(
    normalizedArkivSource,
    /await ensureBragaNetwork\(\); const walletClient = getWalletClient\(ownerAddress\)/,
    "Arkiv writes should re-check the active MetaMask network immediately before submitting",
  );
  assert.match(
    normalizedArkivSource,
    /nonce: nonceState\.next/,
    "Arkiv writes should not let MetaMask choose a stale queued nonce",
  );

  for (const functionName of ["createVaultEntity", "createNoteEntity", "createLinkEntity", "createAccessGrantEntity"]) {
    const functionStart = arkivSource.indexOf(`export async function ${functionName}`);
    assert.notEqual(functionStart, -1, `${functionName} should exist`);
    const nextFunction = arkivSource.indexOf("\nexport async function ", functionStart + 1);
    const functionSource = arkivSource.slice(
      functionStart,
      nextFunction === -1 ? arkivSource.length : nextFunction,
    );

    assert.match(
      functionSource,
      /createEntityWithBrowserBrotli\(\s*params\.owner,/,
      `${functionName} should pass params.owner into the browser-safe Arkiv write helper`,
    );
    assert.doesNotMatch(
      functionSource,
      /\.createEntity\(/,
      `${functionName} must not use the SDK createEntity browser path because it can submit uncompressed calldata`,
    );
    assert.match(
      functionSource,
      /onTransactionSubmitted: params\.onTransactionSubmitted/,
      `${functionName} should forward transaction submission progress to the UI`,
    );
  }
});

test("Arkiv reads use protocol owner filtering in addition to public owner attributes", () => {
  for (const functionName of ["fetchVaults", "fetchNotes", "fetchLinks", "fetchAccessGrants"]) {
    const functionStart = arkivSource.indexOf(`export async function ${functionName}`);
    assert.notEqual(functionStart, -1, `${functionName} should exist`);
    const nextFunction = arkivSource.indexOf("\nexport async function ", functionStart + 1);
    const functionSource = arkivSource.slice(
      functionStart,
      nextFunction === -1 ? arkivSource.length : nextFunction,
    );

    assert.match(
      functionSource,
      /eq\("owner", owner\.toLowerCase\(\)\)/,
      `${functionName} should keep the public owner attribute for indexing and display`,
    );
    assert.match(
      functionSource,
      /\.ownedBy\(ownerAddress\)/,
      `${functionName} should filter by Arkiv protocol owner to prevent spoofed owner attributes`,
    );
  }
});
