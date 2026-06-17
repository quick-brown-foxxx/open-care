import { authHeader, clearToken } from '$lib/state/token.svelte.js';

const BASE = 'https://staging.open-care.org';

interface OperatorResult<T> {
  ok: true;
  value: T;
}

interface OperatorError {
  ok: false;
  error: string;
}

type OpResult<T> = OperatorResult<T> | OperatorError;

async function opFetch<T>(path: string, init?: RequestInit): Promise<OpResult<T>> {
  const header = authHeader();
  if (!header) return { ok: false, error: 'Токен не установлен' };

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: header,
        ...(init?.headers as Record<string, string> | undefined),
      },
    });
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Сетевая ошибка' };
  }

  if (res.status === 401) {
    clearToken();
    return { ok: false, error: 'Сессия истекла. Войдите заново.' };
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as Record<string, unknown>;
      if (body && typeof body === 'object' && 'error' in body) {
        const err = body.error as Record<string, unknown>;
        if (typeof err.message === 'string') msg = err.message;
      }
    } catch {
      /* use default */
    }
    return { ok: false, error: msg };
  }

  const json = (await res.json()) as T;
  return { ok: true, value: json };
}

export interface DisbursementBody {
  amount_usdc_minor: string;
  gift_card_count: number;
  service: string;
  service_note?: string;
  receipt_ref: string;
  public_beneficiary_ref?: null;
  purchased_at_utc: string;
}

export interface DisbursementResponse {
  sequence_no: number;
  event_hash: string;
  head_hash: string;
  public_beneficiary_ref: string | null;
  next_action: string;
}

export async function postDisbursement(
  body: DisbursementBody,
): Promise<OpResult<DisbursementResponse>> {
  return opFetch<DisbursementResponse>('/api/disbursements', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export interface AnchorManualResponse {
  status: string;
  anchored_head_hash: string;
  memo_text: string;
  tx_signature: string;
  duration_ms: number;
  anchor_runs_id: number;
}

export async function postAnchorManual(): Promise<OpResult<AnchorManualResponse>> {
  return opFetch<AnchorManualResponse>('/api/anchor/manual', {
    method: 'POST',
    body: JSON.stringify({ source: 'operator-manual' }),
  });
}

export interface PendingRequest {
  opaque_id: string;
  conversation_id: string;
  internal_handle: string | null;
  request_status: string;
  created_at_utc: string;
  updated_at_utc: string;
}

export interface PendingRequestsResponse {
  items: PendingRequest[];
  next_cursor: string | null;
}

export async function getPendingRequests(): Promise<OpResult<PendingRequestsResponse>> {
  return opFetch<PendingRequestsResponse>('/tg/internal/pending-requests');
}

export interface SendCodeBody {
  opaque_id: string;
  code: string;
  conversation_id: string;
  public_beneficiary_ref?: string;
}

export interface SendCodeResponse {
  delivered_at_utc: string;
}

export async function postSendCode(body: SendCodeBody): Promise<OpResult<SendCodeResponse>> {
  return opFetch<SendCodeResponse>('/tg/internal/send-code', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
