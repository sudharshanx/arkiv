declare module "brotli-wasm/pkg.web/brotli_wasm" {
  export default function init(input?: string | URL | Request | Response | BufferSource | WebAssembly.Module): Promise<unknown>;
  export function compress(buf: Uint8Array): Uint8Array;
  export function decompress(buf: Uint8Array): Uint8Array;
}
