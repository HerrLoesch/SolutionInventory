# Refactoring- und Verbesserungsvorschläge

_Stand: 2026-07-17 (aktualisiert, ursprünglich 2026-07-05) · Analysebasis: Branch `Dev`, v1.11.0_

> **Update 2026-07-17:** Abschnitt 2.1 ist teilweise umgesetzt (Vitest-Unit-Tests für die
> „God"-Klassen, Commit `3487e09`). Neu aufgenommen: 2.0 (Datenverlust-Risiko im Ladepfad)
> und die CI-Lücke, dass die Unit-Tests nicht in der Pipeline laufen (2.2). Die
> Teststrategie für die Katalog-Umstellung ist in `docs/spec-fragenkataloge.md` §6
> ausgearbeitet.

Dieses Dokument beschreibt Verbesserungspotenziale der Codebasis mit Fokus auf
**Qualität**, **Stabilität** und **Best Practices**. Die Vorschläge sind nach
Priorität gruppiert und mit konkreten Fundstellen belegt.

## Überblick der Codebasis

Das Repository besteht aus zwei weitgehend unabhängigen Teilprojekten:

| Bereich | Technologie | Umfang | Tests |
|---|---|---|---|
| `Client/` | Vue 3 + Vuetify, Vite, Electron | ~11.100 Zeilen (Vue/JS) | E2E (Cucumber/Playwright) |
| `MCP/` | .NET 9, Minimal API, C# | ~2.170 Zeilen (C#) | keine |
| `mcp-bridge.js` | Node (stdio ↔ HTTP Bridge) | 290 Zeilen | keine |

Die grundsätzliche Trennung (Client-App, MCP-Server, Bridge) ist sinnvoll. Die
Schwachstellen liegen in der **inneren Struktur** einzelner Bausteine, in der
**Testabdeckung** und in **fehlenden Qualitätsgittern** (Linting, Unit-Tests).

---

## 1. Priorität Hoch – Struktur & Wartbarkeit

### 1.1 Überdimensionierte „God"-Komponenten aufteilen

Mehrere Dateien überschreiten deutlich eine wartbare Größe und bündeln zu viele
Verantwortlichkeiten:

| Datei | Zeilen | Problem |
|---|---|---|
| `Client/src/components/projects/TechRadar.vue` | 2.231 | Rendering, Layout-Geometrie, Drag&Drop, Export, Overrides, Dialoge in einer Datei |
| `Client/src/services/categoriesService.js` | 1.134 | Reines Daten-Literal (Fragebogen-Katalog) im Code |
| `Client/src/components/TreeNav.vue` | 1.124 | Baum-Navigation + Kontextmenüs + Drag&Drop + Rename |
| `Client/src/stores/workspaceStore.js` | 1.086 | Persistenz, Migration, Radar-Logik, Tab-Handling, Import/Export |
| `Client/src/components/projects/ProjectMatrix.vue` | 867 | Matrix-Darstellung + Abweichungsanalyse |

**Empfehlung `TechRadar.vue`:** Die reine Geometrie-/Layout-Berechnung (Ring-Radien,
Blip-Positionierung, Quadranten-Zuordnung) in ein Composable
`useRadarLayout.js` auslösen, den Export nach `techRadarExport.js` (existiert
bereits) verschieben und Dialoge (`EditBlipDialog`, `DetailDialog`) als eigene
Kindkomponenten extrahieren. Ziel: Hauptkomponente < 500 Zeilen, testbare
Pure-Functions für die Geometrie.

**Empfehlung `categoriesService.js`:** Das statische Katalog-Literal (Kategorien,
Metadaten-Optionen, Beispiele) aus dem JS-Code in eine **JSON-Ressource**
(`src/data/catalog.json`) verlagern und im Service nur laden/validieren. Vorteile:
kein Rebuild-Zwang für inhaltliche Änderungen, klarere Trennung Daten/Logik,
leichtere Übersetzbarkeit.

**Empfehlung `workspaceStore.js`:** In fokussierte Module/Composables aufteilen:
- `persistence.js` – Laden/Speichern (localStorage + Electron), Debounce
- `migrations.js` – `migrateProjectRadar` u. ä. Versionsmigrationen
- `radar.js` – Radar-Refs/Overrides
- Der Store selbst hält nur noch State + Orchestrierung.

### 1.2 Options-API vs. Composition-API vereinheitlichen

`TechRadar.vue` nutzt `export default { setup() { ... } }` – also die
Composition-API innerhalb der Options-API-Hülle. Andere Komponenten verwenden
teils reine Options-API. **Empfehlung:** Durchgängig `<script setup>` verwenden.
Das reduziert Boilerplate (kein manuelles `return {}` aus `setup`, keine
`props`-Deklaration doppelt) und ist der aktuelle Vue-3-Standard.

### 1.3 Domänen-Konstanten zentralisieren (DRY)

Die Status-Werte (`Adopt`, `Trial`, `Assess`, `Hold`, `Retire`) sind an
**mindestens fünf** Stellen hartcodiert:

- `Client/src/services/categoriesService.js`
- `Client/src/utils/techRadarExport.js`
- `Client/src/components/projects/TechRadar.vue`
- `Client/src/components/projects/CustomHtmlExportDialog.vue`
- `MCP/McpServer/Services/JsonSchemas.cs`

Die `docs/todos.md` fordert bereits „Enforce standardized status values" – ein
Symptom dieser Streuung. **Empfehlung:** Im Client eine einzige Quelle
(`src/constants/status.js`) definieren und überall importieren. Für den
Client/Server-Gleichstand (C#) die kanonische Liste in einem geteilten
Schema-/Konstanten-Dokument festhalten, gegen das beide Seiten prüfen.

### 1.4 Doppelte Datenmodelle Client ↔ Server

Die Modelle in `MCP/McpServer/Models/` (Questionnaire, Category, Entry, Answer,
RadarEntry …) spiegeln die JS-Strukturen des Clients. Änderungen müssen aktuell
manuell synchron gehalten werden. **Empfehlung:** Ein einziges **JSON-Schema**
als Single Source of Truth definieren (die Client-Export-Struktur), aus dem
C#-Typen und ggf. TS-Typen generiert werden. Zumindest sollte das erwartete
Austauschformat versioniert dokumentiert werden.

---

## 2. Priorität Hoch – Stabilität & Qualitätssicherung

### 2.0 ~~⚠ Datenverlust-Risiko: Ladepfad ersetzt unbekannte Daten durch Seed~~ → behoben (2026-07-17)

**Ursprünglicher Befund:** `initFromStorage()` (`workspaceStore.js:160-196`) rief
`seedWorkspace()` auf, sobald `applyStoredData()` `false` lieferte – und das tat es bei
**jeder** Versionsabweichung (`data.version !== STORAGE_VERSION`). Trifft eine App-Version
auf einen Speicherstand mit anderer Versionsnummer (Downgrade, geteiltes
Electron-Workspace-Verzeichnis, PWA-Cache) oder auf kaputtes JSON, wurde ein frischer
Workspace geseedet; der Autosave (1,5 s Debounce) überschrieb anschließend die
Originaldaten ohne Warnung.

**Behoben:** `initFromStorage()` seedet nur noch, wenn wirklich *kein* Datensatz existiert
(leeres localStorage bzw. `notFound: true` von `readDataFile` im Electron-Fall). Jeder
andere Fehlerfall (Parse-Fehler, nicht erkannte Version, Lesefehler) setzt stattdessen
`workspaceLoadError` (`workspaceStore.js`); `persist()` ist währenddessen ein No-Op, sodass
Autosave die unlesbaren Daten nicht überschreiben kann. Ein Dialog in `App.vue` zeigt den
Fehler an; nur ein expliziter Nutzerklick (`resolveWorkspaceLoadErrorWithFreshWorkspace()`)
seedet einen neuen Workspace. `electron/main.js` liefert dafür `notFound: true`, um „keine
Datei" von „Datei vorhanden, aber unlesbar" zu unterscheiden. Abgesichert durch
`tests/unit/storageCompat.spec.js` (12 Tests, u. a. Web- und Electron-Pfad) gegen die
eingefrorenen Fixtures in `tests/data/storage/`.

**Noch offen (Phase 1, s. `spec-fragenkataloge.md` §3.3.1):** eine echte Migrationskette für
künftige ältere Versionen (aktuell existiert nur `STORAGE_VERSION = 1`, daher kein
Migrationsbedarf) sowie automatisches Backup vor der ersten Persistierung nach einer
Migration. Beides wird mit der Katalog-Einführung (`STORAGE_VERSION = 2`) relevant.

### 2.1 ~~Keine Unit-Tests, nur E2E~~ → teilweise umgesetzt (2026-07-17)

**Erledigt (Commit `3487e09`):** Vitest ist eingerichtet (`npm run test:unit`), mit
7 Spec-Dateien unter `Client/tests/unit/` für `workspaceStore` (CRUD, Tab-Handling,
Legacy-Radar-Migration, Persistenz-Round-Trip), `techRadar`, `techRadarExport`,
`projectMatrix`, `treeNav` und `categoriesService`.

**Offen:**
- Die Unit-Tests laufen **nicht in der CI** (s. 2.2).
- Keine Fixtures, die das persistierte Speicherformat älterer Versionen einfrieren
  (nur Round-Trip innerhalb derselben Codeversion) – s. 2.0 und Spec §6.2.
- Server: weiterhin keine Tests. **xUnit**-Projekt `McpServer.Tests` für
  `QuestionnaireEvaluator` und `ProjectRepository` (Parsing/Migration von
  Workspace-JSON) steht aus.

### 2.2 CI führt Unit-Tests nicht aus und testet den MCP-Server nicht

`ci-dev.yml` und `build-and-deploy.yml` führen nur `npx cucumber-js` aus – der neue
`npm run test:unit`-Lauf fehlt in beiden Workflows und muss als Pflicht-Step **vor**
den E2E-Tests ergänzt werden.

Außerdem schließen beide Workflows `MCP/**` per `paths-ignore` explizit aus und
bauen/testen nur den Client. Der komplette .NET-Teil hat **kein CI**.
**Empfehlung:** Einen `dotnet build` + `dotnet test` Job ergänzen (getriggert bei
Änderungen unter `MCP/**`), damit der Server nicht unbemerkt bricht.

### 2.3 Kein Linting / Formatierungs-Gate

Es existiert keine ESLint-/Prettier-Konfiguration (`package.json` enthält keine
Lint-Skripte, keine `eslint.config.*`). Es gibt zwar eine `.editorconfig`, aber
kein automatisches Gitter. **Empfehlung:**
- `eslint` + `eslint-plugin-vue` + `prettier` einrichten, `npm run lint` als
  Skript, und im PR-Workflow als Pflicht-Step ergänzen.
- Für C#: `dotnet format --verify-no-changes` im CI, ergänzend `.editorconfig`
  Analyzer-Regeln aktivieren (`<AnalysisLevel>latest</AnalysisLevel>`,
  `<TreatWarningsAsErrors>` erwägen).

### 2.4 Fehlerbehandlung: verschluckte Ausnahmen

An mehreren Stellen werden Fehler still verschluckt oder nur auf die Konsole
geloggt:

- `MCP/McpServer/Services/McpSessionManager.cs` – mehrere leere/blanke
  `catch { }` Blöcke (z. B. Zeilen um 122, 198), die JSON-Parsing-Fehler
  unsichtbar machen.
- `Client/src/stores/workspaceStore.js` – `console.error` bei
  Speicher-/Ladefehlern; im Electron-Fall (`writeDataFile`) erfährt der Nutzer
  nichts von einem fehlgeschlagenen Speichern → **Gefahr von Datenverlust ohne
  Rückmeldung**.

**Empfehlung:** Leere `catch`-Blöcke mindestens loggen (`_log.LogAsync`).
Speicherfehler im Client an die UI melden (der „last-saved"-Indikator sollte bei
Fehler einen Fehlzustand anzeigen, nicht stumm bleiben).

### 2.5 localStorage-Persistenz ohne Kapazitäts-/Quota-Behandlung

Der Web-Modus speichert das gesamte Workspace als JSON in localStorage
(`workspaceStore.js`, `persist()`). Bei vielen Projekten/Fragebögen droht das
~5 MB-Limit. Ein `QuotaExceededError` wird aktuell nur per `console.error`
abgefangen. **Empfehlung:** Quota-Fehler explizit erkennen und dem Nutzer
melden; mittelfristig Migration auf **IndexedDB** (z. B. via `idb`) für größere,
robustere Speicherung erwägen.

---

## 3. Priorität Mittel – Sicherheit

### 3.1 MCP-Server: `AllowedHosts: "*"` und ungeschützte Endpunkte

`appsettings.json` setzt `AllowedHosts: "*"`; der Server bindet auf
`http://localhost:5100` (HTTP, kein TLS) und die API-Endpunkte
(`/api/config`, `/api/workspace/*`, `/api/tool/call`) haben **keine
Authentifizierung**. Solange strikt lokal (loopback) betrieben, ist das
akzeptabel – aber `config.json` enthält ein `access_enabled`-Flag, das derzeit
in keinem gelesenen Pfad als Autorisierung greift.

**Empfehlung:** Dokumentieren, dass der Server ausschließlich für localhost
gedacht ist; `AllowedHosts` auf `localhost` einschränken; das `access_enabled`-
Flag tatsächlich als Gate durchsetzen oder entfernen (Dead-Config vermeiden).

### 3.2 Pfad-basiertes Laden ohne Beschränkung

`ProjectRepository.LoadFromFileAsync(string path)` (aufgerufen über
`/api/workspace/load`) öffnet über `Path.GetFullPath` einen **beliebigen** vom
Client gelieferten Pfad. In einem rein lokalen Kontext tolerierbar, aber falls
der Server je exponiert wird, ist das eine Path-Traversal-/Local-File-Read-
Fläche. **Empfehlung:** Erlaubte Basisverzeichnisse whitelisten oder das
Datei-Pfad-Laden abschalten und nur den Upload-Weg (`/api/workspace/upload`)
zulassen.

### 3.3 Electron-Sicherheit – überwiegend gut, aber ergänzen

Positiv: `nodeIntegration: false`, `contextIsolation: true`, sauberer
`contextBridge` in `preload.js`. Ergänzen:
- **`setWindowOpenHandler`** setzen, um neue Fenster / `window.open` zu
  kontrollieren; `will-navigate` abfangen, damit die App nicht zu externen URLs
  navigiert.
- **Content-Security-Policy** für die geladene Seite definieren.

---

## 4. Priorität Mittel – Konsistenz & Best Practices

### 4.1 Uneinheitliche/englisch-deutsch gemischte Rechtschreibung im Code

Der Ordner `Client/src/components/questionaire/` und Testdateien
(`sample_questionaire.json`, `questionaire.feature`) sind als **„questionaire"**
(fehlt ein „n") geschrieben, während der Rest korrekt „questionnaire" nutzt. Das
erschwert Suche und wirkt unsauber. **Empfehlung:** In einem dedizierten Commit
konsistent zu `questionnaire` umbenennen (Ordner, Dateien, evtl. IDs).

### 4.2 `hydrateLastSaved` nutzt fest `de-DE`-Locale

`workspaceStore.js` formatiert den Zeitstempel hart mit
`toLocaleTimeString('de-DE', …)`. Das ist Lokalisierung im Store. Falls die App
zweisprachig (die UI-Texte sind teils Englisch) sein soll, gehört das in eine
i18n-Schicht bzw. an die Locale des Nutzers gekoppelt.

### 4.3 Magic Numbers / Layout-Konstanten

In `TechRadar.vue` und `workspaceStore.js` stehen zahlreiche Zahlen inline
(Ring-Radien, `TOOLTIP_W`, Debounce `1500 ms`, Sidebar-Grenzen `160–640`).
Teilweise sind Konstanten schon extrahiert (`TOOLTIP_W`) – das konsequent für
alle Layout-/Timing-Werte durchziehen und dokumentieren.

### 4.4 `docs/todos.md` als Backlog formalisieren

Die `todos.md` beschreibt sinnvolle Funktionsideen (Chunking, Datenbereinigung,
Konsistenz-Score, Vergleichsberichte). Diese sollten in GitHub Issues überführt
werden, damit sie priorisierbar und nachverfolgbar sind, statt in einer Datei zu
verwaisen.

---

## 5. Priorität Niedrig – Feinschliff

- **`.DS_Store`** ist eingecheckt (Root, `.github/`). In `.gitignore` aufnehmen
  und aus dem Index entfernen.
- **Konsolen-Ausgaben** (`console.error`/`console.log`) in Produktionscode durch
  eine kleine Logging-Abstraktion ersetzen, die im Build stummgeschaltet werden
  kann.
- **JSDoc/Typisierung:** Der Client ist reines JS ohne Typprüfung. Ein
  schrittweiser Umstieg auf **TypeScript** (oder zumindest `// @ts-check` +
  JSDoc-Typen in Services/Stores) würde die Stabilität der datenlastigen Logik
  deutlich erhöhen.
- **`MCP_SETUP.md`** und `README.md` prüfen, ob der localhost-only-Betrieb und
  die Sicherheitsannahmen klar dokumentiert sind.

---

## Empfohlene Reihenfolge (Roadmap)

_(aktualisiert 2026-07-17)_

0. ~~**Datenverlust-Risiko im Ladepfad beheben**~~ (2.0) + Speicherformat-Fixtures
   einfrieren – **erledigt (2026-07-17).** Voraussetzung für jede Datenmodell-Änderung
   (Katalog-Spec) war damit erfüllt.
1. **Qualitätsgitter vervollständigen:** `npm run test:unit` in beide CI-Workflows,
   ESLint/Prettier, `dotnet test` im CI (Abschnitte 2.1–2.3; Vitest selbst ist
   bereits eingeführt). Ohne Netz sind größere Refactorings riskant.
2. **Fehlerbehandlung härten** (2.4/2.5) – schneller Gewinn bei Stabilität und
   Vermeidung stillen Datenverlusts.
3. **Domänen-Konstanten zentralisieren** (1.3) – kleines, risikoarmes Refactoring
   mit sofortiger DRY-Wirkung.
4. **God-Komponenten schrittweise zerlegen** (1.1/1.2), abgesichert durch die in
   Schritt 1 geschaffenen Tests – beginnend mit `categoriesService.js` (reine
   Datenauslagerung, geringstes Risiko), dann `workspaceStore.js`, zuletzt
   `TechRadar.vue`.
5. **Sicherheits- und Konsistenz-Punkte** (Abschnitt 3 & 4) nach Bedarf.
