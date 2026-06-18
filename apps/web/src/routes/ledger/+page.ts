import { getLedgerEvents, getVerify } from '$lib/api/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
  const [ledgerResult, verifyResult] = await Promise.all([
    getLedgerEvents({ limit: 50 }),
    getVerify(),
  ]);

  return {
    ledgerEvents: ledgerResult.ok ? ledgerResult.value : null,
    verify: verifyResult.ok ? verifyResult.value : null,
  };
};
