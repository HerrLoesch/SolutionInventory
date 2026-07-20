# ToDo List - MCP Server

> **Status-Audit 2026-07-18:** Abgleich der Liste gegen den tatsächlichen MCP-Server-Code
> (`MCP/McpServer/`). Umgesetzt: der Konsistenz-Score (§3, `evaluate_responses` /
> `QuestionnaireEvaluator`) sowie das komplette **Data Cleaning & Validation** (§2) über drei
> neue Tools `detect_naming_inconsistencies`, `validate_tech_radar_status` und
> `export_cleaned_data` (Logic in `DataConsistencyAnalyzer`, `TechRadarStatusValidator`,
> `CleanedDataExporter`; kanonisches Vokabular über `SchemaVocabulary` aus dem JSON-Schema).
> Teilweise vorhanden: strukturierte Tool-Beschreibungen (§4) und das Referenz-Fragebogen-Konzept
> (§5). Alles Übrige ist noch offen. Hinweis: Diese Liste betrifft ausschließlich den
> **.NET-MCP-Server** und ist von der Katalog-Umstellung im Client unberührt.

## 1. Performance Optimization
- [ ] **Implement chunking strategy for large-scale data processing**
  - Optimize memory usage and response times when handling extensive questionnaire datasets
  - Define chunk size parameters based on data volume and system constraints

---

## 2. Data Cleaning & Validation

- [x] **Implement data cleaning function to detect naming inconsistencies** _(umgesetzt via Tool `detect_naming_inconsistencies` / `DataConsistencyAnalyzer`: scannt Technologie-Namen, Radar-Optionen sowie Kategorie-/Entry-IDs des gesamten Workspaces und liefert Findings mit Korrekturvorschlag)_
  - [x] Scan all field names, category labels, and identifiers for:
    - [x] Typos or spelling variations _(Levenshtein-basierte Near-Duplicate-Erkennung; Distanz 1 ab 5 Zeichen, Distanz 2 erst ab 8 Zeichen gegen Fehlalarme)_
    - [x] Case inconsistencies (e.g., "TechRadar" vs. "techradar") _(Gruppierung über normalisierten Schlüssel – Casing/Whitespace)_
    - [x] Duplicate or conflicting terminology _(Near-Duplicates + gegen kanonisches Vokabular geprüfte IDs)_
  - [x] Return list of detected inconsistencies with suggested corrections

- [x] **Enforce standardized status values in TechRadar integration** _(umgesetzt via Tool `validate_tech_radar_status` / `TechRadarStatusValidator`: prüft Radar-Einträge und Fragebogen-Antworten gegen die Whitelist und schlägt kanonische Korrekturen vor; `export_cleaned_data` wendet die Korrekturen aktiv an)_
  - [x] Define canonical status values (e.g., "Adopt", "Trial", "Assess", "Hold")
  - [x] Validate all TechRadar entries against this whitelist _(kanonisches Vokabular über `SchemaVocabulary` direkt aus dem JSON-Schema, keine Duplizierung)_
  - [x] Flag or auto-correct deviations from approved status terminology _(Flagging inkl. Vorschlag z. B. `adopt`→`Adopt`, `Retired`→`Retire`; Auto-Korrektur beim Cleaned-Export)_

- [x] **Create `export_cleaned_data(questionnaire_id: str, output_format: str)` function** _(umgesetzt via Tool `export_cleaned_data` / `CleanedDataExporter`; vereinheitlicht Technologie-Schreibweisen, korrigiert Status auf die Whitelist, trimmt Whitespace)_
  - **Input**: 
    - `questionnaire_id` (string): identifier of the questionnaire to export
    - `output_format` (enum: `"json"` or `"csv"`): desired export file format
  - **Output**: JSON object containing:
    - `filepath` (string): absolute or relative path to the exported file
    - `size_mb` (float): file size in megabytes
    - _(zusätzlich `corrections_applied` (int): Anzahl der beim Cleaning geänderten Werte)_

---

## 3. Intelligent Analysis Features

- [x] **Calculate consistency score for all responses** _(umgesetzt via `evaluate_responses` / `QuestionnaireEvaluator.Evaluate`: liefert Konsistenz-Score 0–1, Completeness-% und detaillierte Warnungen; das statistische Outlier-Teilziel ist bewusst offen)_
  - [x] Analyze cross-field logical consistency (e.g., contradictory answers) _(gleiche Technologie mit widersprüchlichem Status quer über den Fragebogen wird erkannt)_
  - [ ] Detect outliers or statistically improbable response patterns _(nicht umgesetzt — keine statistische Analyse)_
  - [x] Generate numeric score and detailed explanation _(Score + Warnungsliste)_

- [ ] **Generate AI-powered response suggestions**
  - Provide context-aware recommendations for incomplete or low-quality answers
  - Base suggestions on historical data, similar questionnaires, or domain knowledge

---

## 4. Documentation & AI Interpretability

- [ ] **Revise all function descriptions for improved AI comprehension** _(teilweise: die Tool-Beschreibungen in `McpSessionManager.BuildToolListResponse` sind bereits klar strukturiert (Zweck, Input-Schema, Parameter mit Beispielen), Output-Schemata liefert `get_json_schema`; ein formaler Durchgang inkl. Fehlerbedingungen/Terminologie-Standards steht noch aus)_
  - Use clear, structured docstrings with:
    - Purpose statement (what the function does)
    - Input parameter types, constraints, and examples
    - Output schema with data types and value ranges
    - Expected error conditions and handling
  - Ensure consistent terminology aligned with ZEISS standards

---

## 5. Comparative Analysis

- [ ] **Implement questionnaire comparison against reference baseline** _(teilweise: das Referenz-Fragebogen-Konzept existiert (Konfig `ReferenceQuestionnaireId`, in `list_questionnaires` markiert), aber ein eigenes Vergleichs-/Diff-Tool mit dem beschriebenen Report fehlt noch)_
  - **Input**: Target questionnaire ID + reference questionnaire ID (or template)
  - **Output**: Detailed diff report highlighting:
    - Missing or extra questions
    - Modified question wording
    - Answer option changes
    - Metadata differences (e.g., version, author)

---

## 6. Reporting & Visualization

- [ ] **Generate HTML report with evaluation results and differences**
  - Include:
    - Overall quality metrics (consistency, completeness)
    - Visual diff (side-by-side comparison with reference)
    - Highlighted warnings and inconsistencies
    - Actionable recommendations for improvement
  - Ensure report is self-contained (embeds CSS, no external dependencies)

---

## Notes
- All functions should include comprehensive error handling and logging
- Use type hints (Python) or TypeScript interfaces for all inputs/outputs
- Maintain backward compatibility with existing MCP tools
