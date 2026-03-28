/**
 * TENMON_NAS_STORAGE_TO_LEDGER_AND_AUTOSTUDY_BIND_PARENT_CURSOR_AUTO_V1
 * NAS を canonical archive root（論理パス）として locator / handoff を束ねる。
 * mount.cifs 不要・passwordless SSH 前提のヒントのみ（本文は NAS、Ark は digest/ledger/locator）。
 */

export type TenmonNasLocatorEntryV1 = {
  materialId: string;
  category: string;
  nas_relative_path: string;
  /** 論理参照（実マウントパスではない） */
  locator_ref: string;
};

export type TenmonNasLocatorManifestV1 = {
  schema: "TENMON_NAS_LOCATOR_MANIFEST_V1";
  version: 1;
  canonical_root: string;
  access_mode: "passwordless_ssh_only";
  mount_cifs_required: false;
  ssh_host_hint: string | null;
  generated_at: string;
  entries: readonly TenmonNasLocatorEntryV1[];
};

export type TenmonNasSourcepackHandoffV1 = {
  schema: "TENMON_NAS_SOURCEPACK_STORAGE_HUB_V1";
  origin: "nas_canonical_archive";
  canonical_root: string;
  locator_manifest_schema: "TENMON_NAS_LOCATOR_MANIFEST_V1";
  digest_ledger_binding: "material_digest_ledger_ref";
  digest_ledger_card: string;
};

export type TenmonNasAutostudyHandoffV1 = {
  schema: "TENMON_NAS_SOURCEPACK_AUTOSTUDY_HANDOFF_V1";
  planner_queue_nas_bound: true;
  canonical_root: string;
};

export type TenmonNasArkAcceptanceRelockV1 = {
  schema: "TENMON_NAS_AND_ARK_ACCEPTANCE_RELOCK_V1";
  nas_locator_manifest_present: boolean;
  ark_holds_digest_and_locator_only: true;
  mount_cifs_not_required: true;
  passwordless_ssh_assumed: true;
};

export function getTenmonNasCanonicalConfigV1(): {
  canonical_root: string;
  ssh_host_hint: string | null;
} {
  const canonical_root = String(process.env.TENMON_NAS_CANONICAL_ROOT || "/volume1/tenmon_ark").trim() || "/volume1/tenmon_ark";
  const h = String(process.env.TENMON_NAS_SSH_HOST || "").trim();
  return { canonical_root, ssh_host_hint: h || null };
}

/**
 * @param materials ledger catalog から渡す id/category（NAS 上の相対配置の種にする）
 */
export function buildTenmonNasLocatorManifestV1(
  materials: ReadonlyArray<{ id: string; category: string }>,
): TenmonNasLocatorManifestV1 {
  const { canonical_root, ssh_host_hint } = getTenmonNasCanonicalConfigV1();
  const entries: TenmonNasLocatorEntryV1[] = materials.map((m) => {
    const id = String(m.id || "").trim();
    const cat = String(m.category || "other").trim() || "other";
    const nas_relative_path = `materials/${cat}/${id}`;
    const locator_ref = ssh_host_hint
      ? `nas+ssh://${ssh_host_hint}${canonical_root}/${nas_relative_path}`
      : `nas+path:${canonical_root}/${nas_relative_path}`;
    return {
      materialId: id,
      category: cat,
      nas_relative_path,
      locator_ref,
    };
  });
  return {
    schema: "TENMON_NAS_LOCATOR_MANIFEST_V1",
    version: 1,
    canonical_root,
    access_mode: "passwordless_ssh_only",
    mount_cifs_required: false,
    ssh_host_hint,
    generated_at: new Date().toISOString(),
    entries,
  };
}

export function buildTenmonNasSourcepackHandoffV1(digestLedgerCard: string): TenmonNasSourcepackHandoffV1 {
  const { canonical_root } = getTenmonNasCanonicalConfigV1();
  return {
    schema: "TENMON_NAS_SOURCEPACK_STORAGE_HUB_V1",
    origin: "nas_canonical_archive",
    canonical_root,
    locator_manifest_schema: "TENMON_NAS_LOCATOR_MANIFEST_V1",
    digest_ledger_binding: "material_digest_ledger_ref",
    digest_ledger_card: String(digestLedgerCard || "").trim() || "TENMON_KHS_DIGEST_LEDGER_AND_PROMOTION_CURSOR_AUTO_V1",
  };
}

export function buildTenmonNasAutostudyHandoffV1(): TenmonNasAutostudyHandoffV1 {
  const { canonical_root } = getTenmonNasCanonicalConfigV1();
  return {
    schema: "TENMON_NAS_SOURCEPACK_AUTOSTUDY_HANDOFF_V1",
    planner_queue_nas_bound: true,
    canonical_root,
  };
}

export function getTenmonNasArkAcceptanceRelockV1(manifest: TenmonNasLocatorManifestV1): TenmonNasArkAcceptanceRelockV1 {
  return {
    schema: "TENMON_NAS_AND_ARK_ACCEPTANCE_RELOCK_V1",
    nas_locator_manifest_present: manifest.entries.length > 0,
    ark_holds_digest_and_locator_only: true,
    mount_cifs_not_required: true,
    passwordless_ssh_assumed: true,
  };
}
