// Pure normalization for questionnaire categories: ensures every entry has
// the instance-only fields (`applicability`, `answers`) a filled-in
// questionnaire needs, regardless of whether the input came from a catalog
// template (no answers yet), an older export, or a partially-edited draft.
export function normalizeCategories(categories) {
  const output = Array.isArray(categories) ? JSON.parse(JSON.stringify(categories)) : []

  output.forEach((category) => {
    if (!category.entries) return
    category.entries.forEach((entry) => {
      if (!entry.applicability) {
        entry.applicability = 'applicable'
      }
      if (['does not apply', 'unknown'].includes(entry.applicability)) {
        entry.answers = [{ technology: entry.applicability, status: '', comments: '' }]
        return
      }
      if (!entry.answers || entry.answers.length === 0) {
        entry.answers = [{ technology: '', status: '', comments: '' }]
      }
    })
  })

  return output
}
