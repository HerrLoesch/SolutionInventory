// Pure, framework-agnostic migration steps for older storage formats. See
// docs/spec-fragenkataloge.md §3.3 for the compatibility strategy this
// implements. None of these functions touch localStorage/Electron I/O
// directly (that lives in persistence.js) — they only transform data that
// has already been read.
//
// STORAGE_VERSION history — which app release a given storage format was
// current in. Update this table whenever STORAGE_VERSION (workspaceStore.js)
// is bumped, alongside a new migration step here. Individual files also
// record the exact app version that wrote them (`appVersion` in the
// persisted snapshot, see persistence.js) — this table gives the range,
// the file gives the precise version.
//   - 1: app <= 1.11.0. Plain `workspace.{projects, questionnaires}`, no
//        catalog concept; the older bare-`categories` and legacy
//        radarRefs/radarOverrides formats also fall under this version.
//   - 2: app > 1.11.0 (Dev branch, unreleased at time of writing — fill in
//        the actual release once this ships). Adds `workspace.catalogs[]`
//        and `project.defaultCatalogId` (§3.3.2); migrated from 1 via
//        migrateWorkspaceToV2 below.
//   - 3: Adds the built-in "Software System Interview" catalog to the library
//        (Phase 6). Purely additive — no existing field changes shape; migrated
//        from 1/2 via migrateWorkspaceToV3 below (idempotent add-if-missing).

import { createWorkspace, createQuestionnaire } from './workspaceFactories'

/**
 * Migrates a project still using the legacy two-array radar format
 * (radarRefs + radarOverrides) into the unified `radar` array, in place.
 * Idempotent — a no-op once `project.radar` is already an array.
 */
export function migrateProjectRadar(project) {
  if (Array.isArray(project.radar)) return
  const refs = Array.isArray(project.radarRefs) ? project.radarRefs : []
  const overrides = Array.isArray(project.radarOverrides) ? project.radarOverrides : []
  project.radar = refs.map((ref) => {
    const norm = String(ref.option || '')
      .trim()
      .toLowerCase()
    const override = overrides.find((o) => o.entryId === ref.entryId && String(o.option || '').toLowerCase() === norm)
    return {
      entryId: ref.entryId,
      option: String(ref.option || '').trim(),
      category: String(override?.categoryOverride || '').trim(),
      status: String(override?.status || '').trim(),
      shortComment: String(override?.shortComment || '').trim(),
      description: String(override?.comment || '').trim(),
      link: String(override?.link || '').trim()
    }
  })
  delete project.radarRefs
  delete project.radarOverrides
}

/**
 * Builds a workspace from the oldest storage format, which persisted a bare
 * `categories` array with no workspace/project wrapper at all.
 */
export function buildWorkspaceFromLegacyCategoriesFormat(categories) {
  const initialQuestionnaire = createQuestionnaire('Current questionnaire', categories)
  return createWorkspace([], [initialQuestionnaire])
}

/**
 * Migrates a v1 workspace (no catalog concept) to v2 in place. See
 * docs/spec-fragenkataloge.md §3.3.2. Additive and idempotent:
 * - Adds `standardCatalog` to `workspace.catalogs` if not already present.
 * - Gives every project a `defaultCatalogId` if it doesn't have one yet.
 * Existing questionnaires are deliberately left as-is (no `catalogId`
 * stamped) — they become legacy instances rather than being assigned a
 * provenance the app cannot actually verify (see spec §7 point 6). Their
 * structure and answers are untouched either way.
 */
export function migrateWorkspaceToV2(workspace, standardCatalog) {
  if (!Array.isArray(workspace.catalogs)) workspace.catalogs = []
  const hasStandardCatalog = workspace.catalogs.some((catalog) => catalog.id === standardCatalog.id)
  if (!hasStandardCatalog) {
    workspace.catalogs.push(standardCatalog)
  }
  ;(workspace.projects || []).forEach((project) => {
    if (!project.defaultCatalogId) {
      project.defaultCatalogId = standardCatalog.id
    }
  })
  return workspace
}

/**
 * Adds the built-in interview catalog to the workspace library in place, if it
 * isn't already there (Phase 6). Additive and idempotent — matched by id, so a
 * workspace that already contains it (or where the user renamed/edited it) is
 * left untouched. Deliberately runs only while upgrading a pre-v3 workspace
 * (see workspaceStore.applyStoredData): once a workspace is stored as v3 the
 * migration no longer runs, so a user who deletes this catalog keeps it deleted
 * rather than having it reappear on every load.
 */
export function migrateWorkspaceToV3(workspace, interviewCatalog) {
  if (!Array.isArray(workspace.catalogs)) workspace.catalogs = []
  const hasInterviewCatalog = workspace.catalogs.some((catalog) => catalog.id === interviewCatalog.id)
  if (!hasInterviewCatalog) {
    workspace.catalogs.push(interviewCatalog)
  }
  return workspace
}
