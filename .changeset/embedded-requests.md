---
'@tonconnect/protocol': minor
'@tonconnect/sdk': minor
'@tonconnect/ui': minor
'@tonconnect/ui-react': minor
---

Add embedded requests

An RPC request (`sendTransaction`, `signMessage`, or `signData`) can now be embedded
directly into the connect URL via an `e` query parameter. On mobile this lets the
wallet handle connection and action in a single tap, eliminating the round-trip for
"connect and pay" flows.

In the UI SDK, pass `enableEmbeddedRequest: true` in the request options to opt in.
With the flag, the result is always wrapped in an `EmbeddedTResponse` envelope:

- `{ hasResponse: true, response }` — the request was completed, either folded into
  connect by an embedded-request-capable wallet, or via the normal bridge flow when
  the wallet was already connected.
- `{ hasResponse: false, connectResult: { dispatched } }` — the wallet connected but
  did not return a signed result. Two sub-cases:
    - `dispatched: false` — the request never reached the wallet;
    - `dispatched: true` — the request was delivered to the wallet inside the
      connect URL, but no response came back. **The wallet may have already
      processed it.** dApps MUST NOT retry silently in this case — surface an
      explicit retry button to the user and, where applicable, verify on-chain
      state (e.g. recipient's recent transaction history) before re-submitting to
      avoid duplicate transactions or signatures.

Wallets declare support via the `EmbeddedRequest` feature in `DeviceInfo.features`.
