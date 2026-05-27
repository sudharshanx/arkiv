import initBrotli, { compress } from "../../node_modules/brotli-wasm/pkg.web/brotli_wasm.js";
import brotliWasmUrl from "../../node_modules/brotli-wasm/pkg.web/brotli_wasm_bg.wasm?url";

let brotliReady: Promise<unknown> | undefined;

export async function brotliCompressBrowser(data: Uint8Array): Promise<Uint8Array> {
  brotliReady ??= initBrotli(brotliWasmUrl);
  await brotliReady;
  return compress(data);
}
