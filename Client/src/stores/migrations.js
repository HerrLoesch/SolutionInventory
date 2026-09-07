// Pure, framework-agnostic migration steps for older storage formats. The
// compatibility strategy they implement is the STORAGE_VERSION history table
// below, pinned by the golden-master fixtures in tests/unit/storageCompat.spec.js.
// None of these functions touch localStorage/Electron I/O
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
 * Adds the three workspace-level fields the vocabulary and comparison features
 * own, if a stored workspace does not carry them yet. Runs version-independently
 * on every load, exactly like migrateProjectRadar above and for the same reason:
 * a missing field is an *absence*, not an older format, so it needs no
 * STORAGE_VERSION bump and no entry in runWorkspaceMigrations. Bumping would
 * make older builds reject the file as `unsupported-version` for no gain —
 * applyStoredData passes the workspace through whole, so unknown fields survive
 * a round trip through a build that does not know them.
 *
 * All three are added together even though only `vocabulary` is used at first.
 * The alternative — one normalization per feature — would mean proving the
 * golden-master property three times instead of once.
 *
 * Additive and idempotent: an existing field of the right type is left exactly
 * as it is, and a field of the wrong type is replaced rather than trusted.
 */
export function normalizeWorkspaceVocabularyFields(workspace) {
  if (!workspace) return
  if (!Array.isArray(workspace.vocabulary)) workspace.vocabulary = []
  if (!workspace.comparisonOverrides || typeof workspace.comparisonOverrides !== 'object') {
    workspace.comparisonOverrides = {}
  }
  if (!Array.isArray(workspace.dismissedSuggestions)) workspace.dismissedSuggestions = []
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
 * Migrates a v1 workspace (no catalog concept) to v2 in place. See the
 * STORAGE_VERSION history at the top of this file. Additive and idempotent:
 * - Adds `standardCatalog` to `workspace.catalogs` if not already present.
 * - Gives every project a `defaultCatalogId` if it doesn't have one yet.
 * Existing questionnaires are deliberately left as-is (no `catalogId`
 * stamped) — they become legacy instances rather than being assigned a
 * provenance the app cannot actually verify. Their
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
