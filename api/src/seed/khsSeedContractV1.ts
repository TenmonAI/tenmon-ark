/**
 * KHS Seed 契約型（生成パイプライン接続は後続カード）。
 */
export type KhsSeedRecordV1 = {
  seedKey: string;
  lawKey?: string;
  unitId?: string;
  quoteHash?: string;
};

export function emptyKhsSeedListV1(): KhsSeedRecordV1[] {
  return [];
}
