import { getTotals, getLedgerEvents, getVerify } from '$lib/api/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
  const [totalsResult, ledgerResult, verifyResult] = await Promise.all([
    getTotals(),
    getLedgerEvents({ limit: 10 }),
    getVerify(),
  ]);

  return {
    totals: totalsResult.ok ? totalsResult.value : null,
    ledgerEvents: ledgerResult.ok ? ledgerResult.value : null,
    verify: verifyResult.ok ? verifyResult.value : null,
  };
};
