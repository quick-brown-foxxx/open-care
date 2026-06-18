import { getVerify } from '$lib/api/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
  const result = await getVerify();
  return {
    verify: result.ok ? result.value : null,
  };
};
