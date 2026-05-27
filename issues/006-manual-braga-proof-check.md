## Parent PRD

`issues/prd.md`

## Type

HITL

## What to build

Manually verify the production Arkiv proof path with MetaMask on Braga and funded GLM. This issue requires human wallet interaction and should not be picked by the AFK agent.

Production app:

https://arkiv-vert.vercel.app/app

Deployment source:

`main` branch. Before manual verification, confirm the production deployment includes the latest `git log -1 --oneline` commit.

Latest non-wallet infrastructure check:

- Braga RPC responded to `eth_blockNumber` on 2026-05-25 with result `0xcf1e0`.
- Braga RPC responded to `eth_blockNumber` on 2026-05-26 with result `0xd98d6`.

## Current verification evidence

- Production `/app` returned HTTP 200 on 2026-05-25.
- Production bundle includes the first-run CTA cleanup and local-key guidance from `aacb208 Polish first-run and local key guidance`.
- User-run MetaMask test reached the verified post-write state in production.
- Screenshot evidence shows:
  - connected wallet `0x05b5...4430`,
  - one readable wallet-owned memory selected,
  - Proof Center status rows complete for wallet, local key, Memory Space, saved Memory, and load/unlock,
  - Proof receipt status `Verified read check`,
  - Memory Space entity and Memory entity visible,
  - Memory Space transaction and Memory transaction rows each linking to Braga Explorer,
  - query result `1 spaces, 1 memories, 1 readable`,
  - copied proof state visible.

## Acceptance criteria

- [x] Open `https://arkiv-vert.vercel.app/app`.
- [x] Confirm first-run copy says `Create wallet-owned memory`, not demo/sample copy.
- [x] Open the create-memory modal.
- [x] Connect MetaMask to Arkiv Braga Testnet.
- [x] Confirm wallet address appears in the header wallet menu.
- [x] Generate or enter a local key.
- [x] Create a Memory Space on Arkiv.
- [x] Confirm the app shows a Braga Explorer link after wallet approval.
- [x] Save an encrypted Memory on Arkiv.
- [x] Confirm the app shows a Braga Explorer link after wallet approval.
- [x] Run `Load and unlock`.
- [x] Confirm Proof Center shows wallet, project scope, Memory Space entity, Memory entity, encrypted payload, Memory Space transaction, and Memory transaction.
- [x] Select the readable memory.
- [x] Copy agent context and verify it contains only selected memories.
- [x] Copy proof and record the copied text or screenshots for judging.

## Repeat-test requirements

- Human wallet interaction and funded Braga GLM are required only when rerunning the live proof flow.
- For the next live Braga test, use `/app` rather than `/app?rehearsal=1`.
- Keep local rehearsal evidence separate from real Braga evidence.

## Next live Braga rerun checklist

- [ ] Open `https://arkiv-vert.vercel.app/app`.
- [ ] Connect MetaMask to Arkiv Braga Testnet.
- [ ] Confirm the wallet has Braga GLM.
- [ ] Save or acknowledge the local key.
- [ ] Create a workspace and confirm the transaction in MetaMask.
- [ ] Confirm the workspace receipt shows an entity key and Braga Explorer link.
- [ ] Save one encrypted memory and confirm the transaction in MetaMask.
- [ ] Confirm the memory receipt shows an entity key and Braga Explorer link.
- [ ] Run Verify read-back.
- [ ] Confirm Proof details show wallet, entity keys, encrypted payload status, network records, and Braga Explorer links.
- [ ] Copy agent context and proof receipt.

## User stories addressed

- User story 9
- User story 10
- User story 11
- User story 13
- User story 16
