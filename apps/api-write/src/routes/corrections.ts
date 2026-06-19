import { Hono } from 'hono';
import { createVaultDb, appendLedgerEvent, getEventsPaginated, getHead } from '@open-care/vault-db';
import type { VaultDb } from '@open-care/vault-db';
import { logInfo, logError, generateRequestId, utcNow } from '@open-care/vault-core';
import type { CorrectionPayload, LedgerEvent } from '@open-care/vault-core';
import type { Env } from '../lib/env.js';
import {
  errorResponse,
  badRequestResponse,
  validationErrorResponse,
  internalErrorResponse,
} from '../lib/errors.js';
import { CorrectionRequestSchema } from '../lib/schema.js';
import type { CorrectionRequest } from '../lib/schema.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getLedgerEventBySequenceNo(
  db: VaultDb,
  sequenceNo: number,
): Promise<LedgerEvent | null> {
  const page = await getEventsPaginated(db, { cursor: sequenceNo - 1, limit: 1 });
  const event = page.items[0];

  if (!event || event.sequence_no !== sequenceNo) {
    return null;
  }

  return event;
}

function correctionTargetNotDisbursementResponse(
  correctsSequenceNo: number,
  requestId: string,
): Response {
  return errorResponse('VALIDATION_ERROR', 'Request body validation failed', 422, requestId, {
    code: 'CORRECTION_TARGET_NOT_DISBURSEMENT',
    field_errors: {
      corrects_sequence_no: [
        `corrects_sequence_no (${correctsSequenceNo}) must reference a disbursement_recorded event`,
      ],
    },
  });
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

const correctionsRoute = new Hono<{ Bindings: Env }>();

/**
 * POST /api/corrections
 *
 * Records a correction that amends a previous ledger event's
 * `receipt_ref` and/or `service_note` fields.
 *
 * Auth: This Worker is reached only via service binding from
 * vault-operator, which already validates OPERATOR_TOKEN. No auth
 * middleware is needed here.
 */
correctionsRoute.post('/api/corrections', async (c) => {
  const requestId = generateRequestId();

  // 1. Parse JSON body
  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return badRequestResponse('Request body is not valid JSON', requestId);
  }

  // 2. Validate with Zod schema
  const parseResult = CorrectionRequestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return validationErrorResponse(parseResult.error, requestId);
  }

  const data: CorrectionRequest = parseResult.data;

  // 3. Create D1 instance
  const db: VaultDb = createVaultDb(c.env.vault_db);

  // 4. Validate corrects_sequence_no < current head
  const head = await getHead(db);
  if (head === null) {
    return validationErrorResponse(
      {
        issues: [
          {
            message: 'Ledger is empty — no events to correct',
            path: ['corrects_sequence_no'],
          },
        ],
      },
      requestId,
    );
  }

  if (data.corrects_sequence_no >= head.sequence_no) {
    return validationErrorResponse(
      {
        issues: [
          {
            message: `corrects_sequence_no (${data.corrects_sequence_no}) must be less than current head (${head.sequence_no})`,
            path: ['corrects_sequence_no'],
          },
        ],
      },
      requestId,
    );
  }

  // 5. Validate the target event type. Corrections only apply to
  //    disbursement events because only disbursements have receipt_ref and
  //    service_note fields.
  const targetEvent = await getLedgerEventBySequenceNo(db, data.corrects_sequence_no);
  if (targetEvent?.event_type !== 'disbursement_recorded') {
    return correctionTargetNotDisbursementResponse(data.corrects_sequence_no, requestId);
  }

  // 6. Validate replacement_fields whitelist: reject any key not in
  //    ['receipt_ref', 'service_note']. The Zod schema already enforces
  //    .strict() on ReplacementFieldsSchema, so unknown keys are caught
  //    at parse time. This is a defense-in-depth runtime check.
  const allowedKeys = ['receipt_ref', 'service_note'];
  for (const key of Object.keys(data.replacement_fields)) {
    if (!allowedKeys.includes(key)) {
      return validationErrorResponse(
        {
          issues: [
            {
              message: `Unknown replacement field: "${key}". Only receipt_ref and service_note are allowed.`,
              path: ['replacement_fields', key],
            },
          ],
        },
        requestId,
      );
    }
  }

  // 7. Build CorrectionPayload
  const payload: CorrectionPayload = {
    corrects_sequence_no: data.corrects_sequence_no,
    reason: data.reason,
    replacement_fields: data.replacement_fields,
    recorded_at_utc: utcNow(),
    recorded_by: 'operator',
  };

  // 8. Append to ledger
  const result = await appendLedgerEvent(db, {
    event_type: 'correction_recorded',
    payload,
    created_at_utc: payload.recorded_at_utc,
  });

  // 9. Handle Result
  if (!result.ok) {
    logError('Correction ledger append failed', {
      error: result.error.message,
      requestId,
    });
    return internalErrorResponse(`Ledger append failed: ${result.error.message}`, requestId);
  }

  const event: LedgerEvent = result.value;

  logInfo('Correction recorded', {
    sequence_no: event.sequence_no,
    corrects_sequence_no: data.corrects_sequence_no,
    requestId,
  });

  return c.json(
    {
      sequence_no: event.sequence_no,
      event_hash: event.event_hash,
      head_hash: event.event_hash,
      corrects_sequence_no: data.corrects_sequence_no,
    },
    200,
  );
});

export { correctionsRoute };
