/**
 * TypeScript verification instructions for the hash chain.
 * Shown in the /api/verify response to guide independent verification.
 */
export const VERIFY_INSTRUCTIONS_TS = `\
// How to independently verify the Crypto Charity Vault hash chain:
//
// 1. Fetch all ledger events from GET /api/ledger-events
//    (paginate with after_sequence_no to get the full chain)
//
// 2. For each event, compute the expected hash:
//    const preimage = {
//      sequence_no: event.sequence_no,
//      event_type: event.event_type,
//      payload: JSON.parse(event.payload_json),
//      prev_hash: event.prev_hash,
//      created_at_utc: event.created_at_utc,
//    };
//    const canonical = canonicalJson(preimage); // RFC 8785 JCS
//    const hashBuffer = await crypto.subtle.digest('SHA-256',
//      new TextEncoder().encode(canonical));
//    const expectedHash = Array.from(new Uint8Array(hashBuffer))
//      .map(b => b.toString(16).padStart(2, '0')).join('');
//
// 3. Verify each event_hash matches the computed expectedHash
//
// 4. Verify each prev_hash matches the previous event's event_hash
//
// 5. Verify the first event's prev_hash is 64 zeros
//    ('0000000000000000000000000000000000000000000000000000000000000000')
//
// 6. Check the latest anchor memo on Solana matches the head hash:
//    - Look up the anchor tx_signature on Solscan
//    - The memo should be "ccv-anchor:<head_hash>"
//
// The @open-care/vault-core package exports canonicalJson(),
// computeEventHash(), verifyChain(), and ZERO_HASH for convenience.
`;
