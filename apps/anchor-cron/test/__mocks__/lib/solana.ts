/**
 * Mock Solana module for tests.
 *
 * Replaces `src/lib/solana.ts` so that `@solana/web3.js` is never imported
 * in the test environment.  The real `@solana/web3.js` → `borsh` →
 * `text-encoding-utf-8` chain has CJS/ESM interop issues that workerd
 * cannot resolve.
 *
 * By default all functions return synthetic success values that match the real
 * module's interface. Tests can explicitly configure failure/retry cases through
 * configureSolanaMock() and must call resetSolanaMockConfig() between cases to
 * avoid cross-test pollution.
 */

import { ok, err } from '@open-care/vault-core';
import type { Result } from '@open-care/vault-core';

// ---------------------------------------------------------------------------
// Fake types that match @solana/web3.js shapes enough for the pipeline
// ---------------------------------------------------------------------------

export interface FakeConnection {
  rpcEndpoint: string;
}

export interface FakePublicKey {
  toBase58(): string;
}

export interface FakeKeypair {
  publicKey: FakePublicKey;
  secretKey: Uint8Array;
}

export interface FakeTransactionResponse {
  slot: number;
  blockTime: number | null;
  confirmationStatus?: 'processed' | 'confirmed' | 'finalized';
  meta: { err: unknown; fee: number; preBalances: number[]; postBalances: number[] };
  transaction: { message: Record<string, unknown>; signatures: string[] };
}

export interface FakeSignatureStatus {
  confirmationStatus?: 'processed' | 'confirmed' | 'finalized';
  confirmations: number | null;
  slot: number;
  err: unknown;
}

export type MockCreateKeypairBehavior = { kind: 'success' } | { kind: 'throw'; message: string };

export type MockSendMemoTransactionBehavior =
  | { kind: 'success'; signature?: string; delay_ms?: number }
  | { kind: 'failure'; message: string; delay_ms?: number }
  | { kind: 'throw'; message: string; delay_ms?: number };

export type MockGetTransactionBehavior =
  | { kind: 'success'; block_time?: number | null }
  | { kind: 'null' }
  | { kind: 'non-finalized'; confirmation_status?: 'processed' | 'confirmed' }
  | { kind: 'failure'; message: string }
  | { kind: 'throw'; message: string };

export type MockGetSignatureStatusBehavior =
  | { kind: 'success'; confirmation_status?: 'finalized'; confirmations?: number | null }
  | { kind: 'null' }
  | { kind: 'non-finalized'; confirmation_status?: 'processed' | 'confirmed' }
  | { kind: 'failure'; message: string }
  | { kind: 'throw'; message: string };

export interface SolanaMockConfig {
  createKeypair?: MockCreateKeypairBehavior;
  sendMemoTransaction?: MockSendMemoTransactionBehavior;
  getSignatureStatus?: MockGetSignatureStatusBehavior;
  getTransaction?: MockGetTransactionBehavior;
}

const DEFAULT_SIGNATURE =
  '5Jofwx5DPe1qBwHL7hN3VpFqLxqFj4mJLo5iY7nP8kRt2sT9uVvWxYzAbCdEfGhIjKlMnOpQrStUvWxYz1234';
const DEFAULT_BLOCK_TIME = 1_712_345_678;

type SolanaMockGlobal = typeof globalThis & {
  __openCareAnchorCronSolanaMockConfig?: SolanaMockConfig;
};

function solanaMockGlobal(): SolanaMockGlobal {
  return globalThis as SolanaMockGlobal;
}

export function readSolanaMockConfig(): SolanaMockConfig {
  return solanaMockGlobal().__openCareAnchorCronSolanaMockConfig ?? {};
}

export function configureSolanaMock(config: SolanaMockConfig): void {
  solanaMockGlobal().__openCareAnchorCronSolanaMockConfig = { ...config };
}

export function resetSolanaMockConfig(): void {
  solanaMockGlobal().__openCareAnchorCronSolanaMockConfig = {};
}

function errorFromMessage(message: string): Error {
  return new Error(message);
}

function fakeFinalizedTransaction(blockTime = DEFAULT_BLOCK_TIME): FakeTransactionResponse {
  return {
    slot: 1000,
    blockTime,
    confirmationStatus: 'finalized',
    meta: { err: null, fee: 5000, preBalances: [], postBalances: [] },
    transaction: {
      message: {},
      signatures: [DEFAULT_SIGNATURE],
    },
  };
}

function fakeFinalizedSignatureStatus(): FakeSignatureStatus {
  return {
    confirmationStatus: 'finalized',
    confirmations: null,
    slot: 1000,
    err: null,
  };
}

async function delayIfConfigured(delayMs: number | undefined): Promise<void> {
  if (!delayMs || delayMs <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

// ---------------------------------------------------------------------------
// Mock implementations
// ---------------------------------------------------------------------------

export function createConnection(rpcUrl: string): FakeConnection {
  return { rpcEndpoint: rpcUrl };
}

export function createKeypair(_base58Secret: string): Result<FakeKeypair, Error> {
  void _base58Secret;
  const behavior = readSolanaMockConfig().createKeypair ?? { kind: 'success' };
  if (behavior.kind === 'throw') {
    throw errorFromMessage(behavior.message);
  }

  // Return a synthetic keypair — the outboundService mock handles the
  // actual RPC calls, so we just need something that looks valid.
  const fakePublicKey: FakePublicKey = {
    toBase58() {
      return 'DrpaVQqo8jAm8hoyqTinsfw2etpm7FhdyezApaD1izYC';
    },
  };
  const fakeKeypair: FakeKeypair = {
    publicKey: fakePublicKey,
    secretKey: new Uint8Array(64),
  };
  return ok(fakeKeypair);
}

export function sendMemoTransaction(
  _connection: FakeConnection,
  _keypair: FakeKeypair,
  _memoText: string,
): Promise<Result<string, Error>> {
  void _connection;
  void _keypair;
  void _memoText;
  const behavior = readSolanaMockConfig().sendMemoTransaction ?? { kind: 'success' };

  return delayIfConfigured(behavior.delay_ms).then(() => {
    if (behavior.kind === 'failure') {
      return err(errorFromMessage(behavior.message));
    }
    if (behavior.kind === 'throw') {
      throw errorFromMessage(behavior.message);
    }
    return ok(behavior.signature ?? DEFAULT_SIGNATURE);
  });
}

export function getBalance(
  _connection: FakeConnection,
  _address: FakePublicKey,
): Promise<Result<number, Error>> {
  void _connection;
  void _address;
  return Promise.resolve(ok(1_000_000_000)); // 1 SOL in lamports
}

export function getTransaction(
  _connection: FakeConnection,
  _signature: string,
): Promise<Result<FakeTransactionResponse | null, Error>> {
  void _connection;
  void _signature;
  const behavior = readSolanaMockConfig().getTransaction ?? { kind: 'success' };

  if (behavior.kind === 'null') {
    return Promise.resolve(ok(null));
  }
  if (behavior.kind === 'failure') {
    return Promise.resolve(err(errorFromMessage(behavior.message)));
  }
  if (behavior.kind === 'throw') {
    return Promise.reject(errorFromMessage(behavior.message));
  }
  if (behavior.kind === 'non-finalized') {
    return Promise.resolve(
      ok({
        ...fakeFinalizedTransaction(),
        confirmationStatus: behavior.confirmation_status ?? 'confirmed',
      }),
    );
  }

  return Promise.resolve(ok(fakeFinalizedTransaction(behavior.block_time ?? undefined)));
}

export function getSignatureStatus(
  _connection: FakeConnection,
  _signature: string,
): Promise<Result<FakeSignatureStatus | null, Error>> {
  void _connection;
  void _signature;
  const behavior = readSolanaMockConfig().getSignatureStatus ?? { kind: 'success' };

  if (behavior.kind === 'null') {
    return Promise.resolve(ok(null));
  }
  if (behavior.kind === 'failure') {
    return Promise.resolve(err(errorFromMessage(behavior.message)));
  }
  if (behavior.kind === 'throw') {
    return Promise.reject(errorFromMessage(behavior.message));
  }
  if (behavior.kind === 'non-finalized') {
    return Promise.resolve(
      ok({
        ...fakeFinalizedSignatureStatus(),
        confirmationStatus: behavior.confirmation_status ?? 'confirmed',
        confirmations: 1,
      }),
    );
  }

  return Promise.resolve(
    ok({
      ...fakeFinalizedSignatureStatus(),
      confirmationStatus: behavior.confirmation_status ?? 'finalized',
      confirmations: behavior.confirmations ?? null,
    }),
  );
}
