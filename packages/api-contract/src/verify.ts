import type { AnchorInfo } from './common.js';

export interface VerifyResponse {
  head_sequence_no: number | null;
  head_hash: string | null;
  latest_anchor: AnchorInfo | null;
  previous_anchors: AnchorInfo[];
  instructions: { typescript: string };
  anchor_stale: boolean;
}
