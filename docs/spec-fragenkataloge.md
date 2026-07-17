# Spec: Fragenkataloge — Verwaltung, Editor und Schema

**Status:** Entwurf (überarbeitet)
**Datum:** 2026-07-17 (ursprünglich 2026-07-06)
**Analysebasis:** Branch `Dev`, v1.11.0 — alle Code-Referenzen am 2026-07-17 verifiziert
**Betrifft:** `Client/src/services/categoriesService.js`, `Client/src/stores/workspaceStore.js`,
`Client/src/components/questionaire/*`, `Client/src/components/workspace/Workspace.vue`,
`Client/src/components/TreeNav.vue`, `Client/src/components/projects/*`

**Änderungen gegenüber Fassung vom 2026-07-06:**

- §1.4 neu: vorhandene Testinfrastruktur (Vitest-Unit-Tests seit Commit `3487e09`) als Ausgangsbasis.
- §3.3 grundlegend überarbeitet: Die ursprünglich geplante Migration über
  „`STORAGE_VERSION` erhöhen" würde mit dem heutigen Ladepfad zu **Datenverlust** führen
  (Befund B1). Neue, verlustfreie Migrationsstrategie.
- §6 neu: verbindliche Teststrategie mit Schwerpunkt Abwärtskompatibilität
  (Golden-Master-Fixtures, Migrations- und Round-Trip-Tests, CI-Härtung).
- §5.5 Umsetzungsphasen: Phase 0 ist jetzt das „Sicherheitsnetz" (Tests zuerst, dann Datenmodell).
- §5.6 Akzeptanzkriterien um Kompatibilitätskriterien ergänzt.

---

## 1. Ausgangslage

### 1.1 Aktuelles Modell (Ist)

- **Ein einziger, fest verdrahteter Katalog.** Die komplette Fragenstruktur (Kategorien →
  Entries/Aspekte → Beispiele) liegt hartkodiert in `categoriesService.js` (1.134 Zeilen) und
  wird über `getCategoriesData()` geliefert. Es gibt keine Möglichkeit, mehrere Kataloge zu führen.
- **Fragebogen = Instanz mit vermischter Struktur und Antworten.** Ein „Questionnaire"
  entsteht durch Klonen des Standardkatalogs (`createQuestionnaire(name, catalogData.categories)`,
  `workspaceStore.js:475-495`). Struktur (Aspekte, Beispiele) und Antworten
  (`answers`, `entryComment`, gewählte `applicability`, Metadatenwerte) stehen danach
  gemeinsam im selben Objekt.
- **Projekt = Name + Fragebogen-IDs.** `createProject()` (`workspaceStore.js:21-27`) kennt
  keinen Katalogbezug. Beim Anlegen (`addProject`, Zeile 436) wird nichts ausgewählt.
- **Strukturbearbeitung nur im Modal.** `QuestionnaireConfig.vue` wird von `Workspace.vue`
  in einem `v-dialog` geöffnet — erreichbar nur über ein verstecktes Zahnrad in der
  Metadaten-Kategorie des Fragebogens.
- **Persistenz:** Web speichert unter dem localStorage-Key `solution-inventory-data`,
  Electron in eine JSON-Datei im gewählten Workspace-Verzeichnis. Beide Wege schreiben
  dasselbe Format mit `version: 1` (`STORAGE_VERSION`, `workspaceStore.js:6`).

### 1.2 Konzeptionelle Lücke

Es fehlt ein **Katalog als eigenständige Entität**. Daraus folgen die fachlichen Defizite,
die diese Spec adressiert:

- **K1 — Kein Katalog-Repository.** Mehrere Fragenkataloge (z. B. „Backend-Assessment",
  „Frontend-Assessment", „Security-Review") lassen sich nicht nebeneinander pflegen.
- **K2 — Keine Katalogauswahl beim Projekt.** Beim Anlegen eines Projekts kann kein
  Default-Katalog gewählt werden; jeder Fragebogen erbt zwangsweise den einen hartkodierten
  Katalog.
- **K3 — Struktur und Vorlage vermischt.** Weil es keine Trennung zwischen Vorlage (Katalog)
  und ausgefüllter Instanz (Fragebogen) gibt, muss Struktur im Kontext eines mit Antworten
  gefüllten Fragebogens editiert werden.
- **K4 — Kein Schema, keine Validierung.** Katalogstrukturen (auch importierte) werden nirgends
  gegen ein definiertes Schema geprüft. Fehlende Pflichtfelder oder inkonsistente IDs fallen
  erst zur Laufzeit auf.

### 1.3 Usability-Probleme des Struktur-Editors

Unabhängig vom fehlenden Katalog-Konzept ist der bestehende Editor
(`QuestionnaireConfig.vue`, 430 Zeilen) schwer bedienbar:

| # | Problem | Ort im Code |
|---|---------|-------------|
| P1 | **Editor im Modal-Dialog eingesperrt.** Verschachteltes Scrolling (Dialog, Kategorienliste, Entry-Liste), kein Platz, kein Nebeneinander. | `Workspace.vue:54-70` |
| P2 | **Ungespeicherte Änderungen gehen kommentarlos verloren.** „Close" / ESC / Klick außerhalb verwerfen die lokale Kopie `localCategories` ohne Warnung. | `QuestionnaireConfig.vue:210, 355-359`; `Workspace.vue:67` |
| P3 | **Browser-Popups statt UI.** `alert()` beim Speichern, `confirm()` bei Löschen/Reset — blockierend, kein Undo. | `QuestionnaireConfig.vue:263, 343, 358, 362` |
| P4 | **Alle Entries als lange, aufgeklappte Formular-Wand.** Kein Einklappen, keine Suche, kein Springen. | `QuestionnaireConfig.vue:75-135` |
| P5 | **Keine Sortierung / kein Verschieben** von Kategorien, Entries, Beispielen. Reihenfolge = Erstellungsreihenfolge. | fehlt |
| P6 | **IDs werden bei jeder Titeländerung neu generiert** und brechen Referenzen (ausgeblendete Entries, Pending-Navigation, Referenzvergleiche). | `QuestionnaireConfig.vue:271-275, 348-353` |
| P7 | **Editor bearbeitet das Datenmodell nur teilweise.** Nicht editierbar: `entry.description`, `appliesTo` (Sichtbarkeitslogik!), `example.tools` (speist Solution-Vorschläge), `metadataOptions`. Änderung nur über JSON-Export. | `QuestionnaireConfig.vue` gesamt |
| P8 | **Keine Validierung.** Doppelte Titel/IDs, leere Aspekte, leere Beispiel-Labels werden ohne Hinweis gespeichert. | — |
| P9 | **Unklarer Speicher-Scope.** „Save Changes" / „Reset" wirken auf den ganzen Katalog, stehen aber unter dem Kategorie-Editor. | `QuestionnaireConfig.vue:160-173` |
| P10 | **Kein Undo** für Löschen oder Feldänderungen. | — |
| P11 | **Einstieg versteckt** (Zahnrad nur in der Metadaten-Kategorie). | `Questionnaire.vue:47-55` |

### 1.4 Vorhandene Qualitätssicherung (Stand 2026-07-17)

Seit der Erstfassung dieser Spec wurde eine Unit-Test-Basis geschaffen (Commit `3487e09`),
auf der die Teststrategie in §6 aufsetzt:

- **Vitest** ist eingerichtet (`vitest.config.js`, `npm run test:unit`), mit
  `@vue/test-utils`, `@pinia/testing` und jsdom.
- **7 Spec-Dateien** unter `Client/tests/unit/`: `workspaceStore.spec.js` (u. a. CRUD,
  Tab-Handling, Legacy-Radar-Migration, Persistenz-Round-Trip), `techRadar.spec.js`,
  `techRadarExport.spec.js`, `projectMatrix.spec.js`, `treeNav.spec.js`,
  `categoriesService.spec.js`.
- **E2E:** 9 Cucumber/Playwright-Szenarien (`Client/tests/features/`), inkl. Projekt-Export/-Import
  mit `tests/data/golden_sample_project.json` als eingefrorenem Beispielprojekt.
- **Lücke L1:** Beide CI-Workflows (`ci-dev.yml`, `build-and-deploy.yml`) führen nur
  `npx cucumber-js` aus — **die Unit-Tests laufen nicht in der CI.**
- ~~**Lücke L2**~~ **Geschlossen (2026-07-17):** Golden-Master-Fixtures unter
  `Client/tests/data/storage/` (`v1-workspace-full.json`, `v1-workspace-legacy-radar.json`,
  `v1-categories-only.json`) frieren reale Speicherformate ein; `storageCompat.spec.js`
  prüft Verlustfreiheit, Idempotenz und Re-Persist-Round-Trip dagegen (§6.2) und
  dokumentiert B1 (§1.5) als Charakterisierungstest. Fehlt noch: Migrationsstufe v2
  (folgt mit der Katalog-Einführung) und die eigentliche Behebung von B1 (§5.5 Phase 0,
  Schritt 4).

### 1.5 Kritischer Befund B1: Ladepfad kann Bestandsdaten verwerfen — behoben (2026-07-17)

**Ursprünglicher Befund:** `initFromStorage()` (`workspaceStore.js:160-196`) rief
`seedWorkspace()` auf, wenn `applyStoredData(data)` `false` lieferte. `applyStoredData`
akzeptierte Daten aber nur bei exakter Versionsgleichheit (`data.version === STORAGE_VERSION`).
Folge: Traf eine App-Version auf einen Speicherstand mit anderer Versionsnummer (älter
*oder* neuer, z. B. Downgrade, geteiltes Electron-Workspace-Verzeichnis) oder auf kaputtes
JSON, wurde ein frischer Seed-Workspace erzeugt; der nächste Autosave-Schreibvorgang
überschrieb die Originaldaten unwiederbringlich — ohne Warnung, ohne Backup.

Die Erstfassung dieser Spec sah für die Katalog-Migration schlicht vor,
„`STORAGE_VERSION` zu erhöhen". Das hätte genau dieses Szenario ausgelöst.

**Behoben:** `initFromStorage()` seedet nur noch, wenn nachweislich **kein** Datensatz
existiert (leeres localStorage bzw. `notFound: true` von `readDataFile` im Electron-Fall,
`electron/main.js`). Jeder andere Fall — Parse-Fehler, nicht erkannte Version, sonstiger
Lesefehler — setzt stattdessen `workspaceLoadError` im Store; `persist()` ist währenddessen
ein No-Op, sodass Autosave nichts überschreiben kann. `App.vue` zeigt einen Fehlerdialog;
nur ein expliziter Klick (`resolveWorkspaceLoadErrorWithFreshWorkspace()`) seedet einen
neuen Workspace. Abgesichert durch 12 Tests in `storageCompat.spec.js` (Web- **und**
Electron-Pfad) gegen die Fixtures aus §6.2.

**Noch offen** (Phase 1, mit der Katalog-Einführung): eine echte Migrationskette für dann
existierende ältere Versionen (aktuell gibt es nur `STORAGE_VERSION = 1`, daher noch keine
Migrationsstufe nötig) sowie automatisches Backup vor der ersten Persistierung nach einer
Migration (§3.3.1 Punkt 3).

---

## 2. Zielbild

### 2.1 Begriffsmodell

Die Spec trennt drei Konzepte sauber:

| Begriff | Rolle | Enthält | Wird bearbeitet in |
|---------|-------|---------|--------------------|
| **Katalog** (Fragenkatalog) | Wiederverwendbare **Vorlage**. Zentral in einer Bibliothek verwaltet, schema-validiert. | Struktur: Kategorien, Entries, Beispiele, `appliesTo`, `metadataOptions`, Status-/Applicability-Vokabular. **Keine** Antworten. | Katalog-Editor |
| **Fragebogen** (Questionnaire) | **Instanz** eines Katalogs innerhalb eines Projekts. | Kopie der Katalogstruktur **plus** Antworten (`answers`, `entryComment`, gewählte `applicability`, Metadatenwerte). Provenienz: `catalogId` + `catalogVersion`. | Ausfüll-Ansicht (`Questionnaire.vue`) |
| **Projekt** | Klammer über einen oder mehrere Fragebögen. | `defaultCatalogId`, `questionnaireIds[]`, Radar-Daten. | Projektverwaltung / `TreeNav` |

**Kernaussage:** Ein Katalog ist die Vorlage, ein Fragebogen die im Projekt gespeicherte,
ausgefüllte Kopie. Beim Anlegen eines Projekts wird ein Default-Katalog gewählt; daraus wird
der erste Fragebogen instanziiert und dessen Antworten im Projekt gespeichert.

### 2.2 Leitprinzipien

1. **Katalog ist eine First-Class-Entität** in einer verwaltbaren Bibliothek — nicht länger
   hartkodiert.
2. **Vorlage und Instanz sind getrennt.** Kataloge werden im Katalog-Editor bearbeitet;
   Fragebögen werden ausgefüllt. Kein Struktur-Editieren mehr im Kontext gefüllter Antworten.
3. **Jeder Katalog ist schema-validiert.** Ein verbindliches Schema definiert die gültige
   Struktur; Kataloge werden beim Speichern und beim Import dagegen geprüft.
4. **Editieren ist ein eigener Arbeitsbereich, kein Popup.** Master-Detail-Layout: links
   Struktur­baum mit Suche und Drag & Drop, rechts das Formular des gewählten Elements.
5. **Kein Datenverlust, keine Browser-Popups.** Dirty-State sichtbar, Verlassen abgefangen,
   Löschen per Undo-Snackbar statt `confirm()`.
6. **IDs sind stabil.** Einmal vergebene IDs werden beim Umbenennen nicht angefasst.
7. **Abwärtskompatibilität ist nicht verhandelbar.** Workspaces, Projekte und Fragebögen,
   die mit einer älteren App-Version angelegt oder exportiert wurden, laden nach dem Umbau
   verlustfrei und bleiben voll funktionsfähig (Details §3.3, Nachweis §6). Der Ladepfad
   darf vorhandene Nutzdaten **niemals** stillschweigend durch einen Seed ersetzen (B1).

---

## 3. Datenmodell

### 3.1 Zielmodell

```
Workspace
├─ catalogs[]          ← NEU: Bibliothek der Vorlagen
├─ projects[]
└─ questionnaires[]

Catalog                ← NEU
├─ id, name, description
├─ version             (hochzählend bei Strukturänderung)
├─ schemaVersion       (Version des Katalog-Schemas)
├─ statusOptions[]     { label, description }      (Vokabular, s. Offene Punkte)
├─ applicabilityOptions[]
└─ categories[]
   ├─ id, title, desc, isMetadata, appliesTo?
   ├─ metadata / metadataOptions   (nur Metadaten-Kategorie)
   └─ entries[]
      ├─ id, aspect, description?, appliesTo?
      ├─ defaultApplicability?
      └─ examples[]  { label, description, tools[] }

Project
├─ id, name
├─ defaultCatalogId?   ← NEU: beim Anlegen gewählt; optional (Altbestand: leer)
├─ questionnaireIds[]
└─ radar, radarCategoryOrder, …

Questionnaire (Instanz)
├─ id, name
├─ catalogId?          ← NEU: Herkunftskatalog; optional (Altbestand: leer)
├─ catalogVersion?     ← NEU: instanziierte Katalogversion; optional
└─ categories[]        (Kopie inkl. answers, entryComment, applicability, metadata)
```

**Abgrenzung Vorlage ↔ Instanz:** Katalog-`entries` enthalten **keine**
`answers`/`entryComment`; Katalog-Kategorien enthalten `metadataOptions`, aber keine gefüllten
`metadata`-Werte. Beim Instanziieren (`instantiateCatalog`) werden diese instanz­spezifischen
Felder mit Defaults erzeugt.

**Kompatibilitätsregel:** Alle neuen Felder (`catalogs`, `defaultCatalogId`, `catalogId`,
`catalogVersion`) sind **optional mit definiertem Fallback**. Jeder Code-Pfad, der sie liest,
muss mit `undefined` umgehen können: Ein Fragebogen ohne `catalogId` ist eine gültige
„Legacy-Instanz" und verhält sich exakt wie heute (Anzeigen, Ausfüllen, Radar, Vergleich,
Export). Es gibt keinen Zwang, Altbestand einem Katalog zuzuordnen.

### 3.2 Katalog-Schema

Ein verbindliches Schema (`catalog.schema.json`, JSON Schema Draft 2020-12) beschreibt die
gültige Katalogstruktur und dient als Prüf- und Dokumentationsgrundlage. Verbindliche Regeln
(Auszug):

- **Katalog:** `id`, `name`, `version`, `schemaVersion`, `categories` (min. 1) erforderlich;
  genau **eine** Kategorie mit `isMetadata: true`.
- **Kategorie:** `id`, `title` erforderlich; `id` eindeutig im Katalog, Muster
  `^[a-z0-9-]+$`. Nicht-Metadaten-Kategorien haben `entries`.
- **Entry:** `id`, `aspect` erforderlich; `id` eindeutig **innerhalb der Kategorie**.
- **Example:** `label` erforderlich; `tools` optionales String-Array.
- **appliesTo:** Objekt `{ <metadataFeld>: string | string[] }`; die Feldnamen müssen zu
  Feldern der Metadaten-Kategorie passen, die Werte zu deren `metadataOptions`.

Zur Prüfung wird ein Laufzeit-Validator `validateCatalog(catalog)` bereitgestellt
(`catalogValidation.js`), der eine Liste von Befunden (Fehler/Warnungen mit Pfadangabe)
zurückgibt. Aufgerufen wird er:

1. **beim Speichern** im Katalog-Editor (blockierend bei Fehlern, s. §4.5),
2. **beim Import** eines Katalogs oder Projekts,
3. **im Test** als Fixture-Prüfung für den mitgelieferten Standardkatalog (§6.4).

**Wichtig:** Der Validator gilt für **Kataloge (Vorlagen)**, nicht für Fragebogen-Instanzen.
Bestehende Fragebögen — auch strukturell „unsaubere" aus Altbeständen — werden beim Laden
**nicht** gegen das Schema geprüft und **niemals** deswegen abgewiesen. Für Instanzen bleibt
das tolerante `normalizeCategories()` (`workspaceStore.js:948-970`) die einzige Aufbereitung.

### 3.3 Migration und Abwärtskompatibilität

Ersetzt die Erstfassung („`STORAGE_VERSION` erhöhen"): Die Migration wird so gebaut, dass
**kein Ladeszenario Bestandsdaten verwirft** (Befund B1, §1.5).

#### 3.3.1 Grundsätze

1. **Tolerantes Laden statt Versionsgleichheit.** `applyStoredData()` prüft nicht mehr auf
   `data.version === STORAGE_VERSION`, sondern akzeptiert jede Version `<= STORAGE_VERSION`
   und schickt die Daten durch eine **Migrationskette** (`migrations.js`, pro Versionssprung
   eine reine Funktion `migrateV1toV2(data)` usw.). Jede Migrationsstufe ist idempotent und
   additiv (fügt Felder hinzu, entfernt/ändert keine Nutzdaten).
2. **Seed nur bei wirklich leerem Speicher.** `seedWorkspace()` läuft ausschließlich, wenn
   *kein* gespeicherter Datensatz existiert. Ist ein Datensatz vorhanden, aber nicht lesbar
   (Parse-Fehler, unbekannte *neuere* Version), wird **nicht geseedet und nicht gespeichert**:
   Der Autosave bleibt deaktiviert, die UI zeigt einen Fehlerzustand („Workspace-Daten
   stammen aus einer neueren Version / sind beschädigt") mit den Optionen *Backup anlegen und
   neu beginnen* oder *App aktualisieren/Datei wählen*. Damit ist stiller Datenverlust
   ausgeschlossen — auch beim Downgrade.
3. **Backup vor Migration.** Bevor eine Migrationskette Daten verändert und erstmals im neuen
   Format persistiert wird: Electron legt `<workspace>/data.backup-v<alt>.json` an, Web
   schreibt den Alt-Stand unter `solution-inventory-data.backup-v<alt>` in localStorage.
   Das Backup wird nur einmal je Versionssprung erzeugt und nie automatisch gelöscht.
4. **Exporte bleiben kompatibel — in beide Richtungen.**
   - *Import alt → neu:* Projekt-/Fragebogen-Exporte des heutigen Formats (ohne Katalogfelder)
     bleiben unverändert importierbar; fehlende Katalogfelder ⇒ Legacy-Instanz (§3.1).
   - *Export neu → alt:* Das Projekt-Exportformat behält seine heutige Grundstruktur
     (`{ project, questionnaires }`); neue Felder werden nur **zusätzlich** aufgenommen,
     damit ältere App-Versionen (die unbekannte Felder ignorieren) die Datei weiterhin lesen.

#### 3.3.2 Migrationsschritte v1 → v2 (Katalog-Einführung)

1. **Standardkatalog erzeugen.** Aus `getCategoriesData()` wird ein Katalog
   „Standard-Katalog" (`id: 'catalog-standard'`, `version: 1`) gebildet und in
   `workspace.catalogs` abgelegt — nur, falls noch nicht vorhanden (Idempotenz).
   `categoriesService.js` wird damit vom hartkodierten Datenlieferant zum reinen
   Seed-Lieferant für diesen einen Katalog.
2. **Bestehende Fragebögen verknüpfen — konservativ.** Vorhandene Fragebögen erhalten
   `catalogId = 'catalog-standard'` und `catalogVersion = 1` **nur als Provenienz-Hinweis**;
   ihre `categories` (Struktur *und* Antworten) bleiben byte-identisch erhalten. Es findet
   kein Abgleich/„Upgrade" der Struktur gegen den Katalog statt. Alternativ zulässig:
   Felder leer lassen (reine Legacy-Instanz) — Entscheidung fällt in Phase 0 anhand der
   Fixture-Tests; beides muss von der App gleich behandelt werden.
3. **Projekte ergänzen.** Jedes Projekt erhält `defaultCatalogId = 'catalog-standard'`.
4. **Bestehende Legacy-Zweige bleiben.** Die vorhandenen Migrationen
   (`migrateProjectRadar` für `radarRefs`/`radarOverrides`, der `data.categories`-Zweig für
   das älteste Speicherformat) ziehen unverändert in die Migrationskette um.

Die Migration läuft in `applyStoredData()` und ist durch die Tests in §6.2 abgesichert.

#### 3.3.3 Programmversion im Datenmodell — ✅ erledigt (2026-07-17)

Damit sich zu einer gespeicherten Datei nachvollziehen lässt, mit welcher Programmversion
ihr Datenmodell zuletzt geschrieben wurde (unabhängig vom groben `STORAGE_VERSION`-Sprung),
trägt jeder persistierte Snapshot zusätzlich die exakte App-Version:

- **`appVersion`** (`buildSnapshot()`, `persistence.js`) — der Wert aus `package.json`
  (`__APP_VERSION__`, bereits zuvor für den Info-Dialog verwendet) wird bei jedem `persist()`
  und `persistTo()` in den Snapshot geschrieben, neben dem bereits vorhandenen `timestamp`.
  Optional/additiv: Dateien aus Versionen vor diesem Feld (App ≤ 1.11.0) haben es schlicht
  nicht — das ist kein Fehler, sondern zeigt „geschrieben vor Einführung dieses Feldes".
- **Versions-Historie** (`migrations.js`, Kopfkommentar) dokumentiert, welcher
  `STORAGE_VERSION`-Wert in welchem App-Versionsbereich geführt hat (grobe Zuordnung,
  z. B. „`STORAGE_VERSION` 1: App ≤ 1.11.0"). Bei jeder `STORAGE_VERSION`-Erhöhung ist diese
  Tabelle zusammen mit der neuen Migrationsstufe zu aktualisieren — inklusive Nachtrag der
  tatsächlichen Release-Version, sobald sie erscheint (zum Zeitpunkt dieser Änderung noch
  unveröffentlicht auf `Dev`).

**Abgrenzung zu bereits bestehender Versionierung:** `appVersion` beschreibt die
*Speicherformat-Herkunft* eines Workspace. Das ist unabhängig von `Catalog.version`
(inhaltliche Katalog-Revision), `Catalog.schemaVersion` (Version des Katalog-Schemas, §3.2)
und `Questionnaire.catalogVersion` (welche Katalogversion instanziiert wurde) — diese vier
Versionsfelder beantworten jeweils eine andere Frage und ergänzen sich.

---

## 4. UI-Konzept

### 4.1 Katalogverwaltung (Bibliothek)

Neuer Bereich in der `TreeNav` (oberhalb der Projekte): **„Fragenkataloge"** listet alle
Kataloge der Bibliothek. Pro Katalog ein Kontextmenü (⋮): *Öffnen (Editor), Duplizieren,
Umbenennen, Exportieren, Löschen*. Button **„+ Katalog"** legt einen leeren, schema-gültigen
Katalog an (nur Metadaten-Kategorie). Löschen ist nur möglich, wenn kein Projekt den Katalog
als `defaultCatalogId` referenziert (sonst Hinweis mit betroffenen Projekten).

### 4.2 Projekt anlegen mit Katalogauswahl

Der „+ Projekt"-Flow (heute in `TreeNav.vue`) bekommt einen Dialog:

```
┌─ Neues Projekt ───────────────────────────────┐
│ Name*            [ Zahlungsplattform        ]  │
│ Default-Katalog* [ Backend-Assessment    ▾ ]  │
│                  ↳ 6 Kategorien · 34 Fragen    │
│ ☑ Ersten Fragebogen aus Katalog anlegen        │
│                          [Abbrechen] [Anlegen] │
└────────────────────────────────────────────────┘
```

Beim Anlegen: `defaultCatalogId` wird gesetzt; ist die Checkbox aktiv, wird per
`instantiateCatalog(defaultCatalogId)` ein erster Fragebogen erzeugt und im Projekt
gespeichert. Weitere Fragebögen im Projekt nutzen standardmäßig denselben Katalog, ein
abweichender kann pro Fragebogen gewählt werden.

### 4.3 Katalog-Editor

Der Editor öffnet einen Katalog aus der Bibliothek als **eigenen Workspace-Tab** (löst P1/P11:
kein Modal, prominenter Einstieg). Master-Detail:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Katalog: „Backend-Assessment"  v3        ● ungespeichert   [Rückgängig][Speichern] ⋮│
├───────────────────────────┬──────────────────────────────────────────────────┤
│ 🔍 Suche in Struktur…     │  ENTRY BEARBEITEN                                 │
│ ┌───────────────────────┐ │  ┌────────────────────────────────────────────┐  │
│ │ ▸ Metadaten     (Meta)│ │  │ Aspekt*    [ Persistenz                  ] │  │
│ │ ▾ Architektur      ⋮  │ │  │ ID         solution-persistence   [⟳ neu]  │  │
│ │   ≡ Schnittstellen    │ │  │ Beschreibung                               │  │
│ │   ≡ Persistenz   ◀────┼─┼──│ [ Wie werden Daten gespeichert? …        ] │  │
│ │   ≡ Messaging         │ │  ├────────────────────────────────────────────┤  │
│ │   + Entry hinzufügen  │ │  │ BEISPIELE                    [+ Beispiel]  │  │
│ │ ▸ Qualität         ⋮  │ │  │ ≡ PostgreSQL | relationale DB | 🏷 2 Tools ✕│  │
│ │ ▸ Betrieb          ⋮  │ │  │ ≡ MongoDB    | Dokumenten-DB | 🏷 0 Tools ✕│  │
│ └───────────────────────┘ │  ├────────────────────────────────────────────┤  │
│ [+ Kategorie]             │  │ ▸ Sichtbarkeit (appliesTo)    2 Bedingungen│  │
│                           │  └────────────────────────────────────────────┘  │
│                           │  ⚠ Validierung: 1 Hinweis (doppelter Aspekt)     │
└───────────────────────────┴──────────────────────────────────────────────────┘
```

- **Strukturbaum links:** Kategorien aufklappbar, Entries als Kinder. `≡` = Drag-Handle
  (umsortieren innerhalb der Kategorie, verschieben zwischen Kategorien). `⋮` = Knoten-Menü
  (*Umbenennen, Duplizieren, Löschen, Nach oben/unten*). Suchfeld filtert live
  (Titel + Aspekt + Beschreibung).
- **Detailbereich rechts:** zeigt genau das ausgewählte Element — Kategorie-, Entry- oder
  (bei der Metadaten-Kategorie) den Metadaten-Optionen-Editor.
- **Kopfzeile:** Katalogname + Version, Dirty-Indikator, *Speichern*, *Rückgängig*.
  Sekundärmenü (⋮): *JSON ansehen, Exportieren, Validierungsbericht, Alles zurücksetzen*.

Das Kategorie-Formular zeigt Titel, ID (fix, mit „⟳ neu"), Beschreibung, `isMetadata`, den
`appliesTo`-Editor sowie eine kompakte Entry-Kurzliste (Klick öffnet den Entry rechts).

### 4.4 Sub-Editoren

**Beispiel-Editor** (im Entry-Formular): sortierbare Zeilen; Klick klappt Label, Beschreibung
und die **Tools-Liste** auf (Chips mit Freitext — sie speisen die Solution-Vorschläge im
Ausfüllmodus, `Questionnaire.vue:648-672`):

```
≡ [ PostgreSQL          ] [ relationale Datenbank    ]  ✕
    Tools:  (pgAdmin ✕) (psql ✕)  [ + Tool… ]
```

**appliesTo-Editor** (in Kategorie und Entry, aufklappbar): eine Zeile pro Bedingung, Feld aus
den Metadaten-Feldern, Werte aus `metadataOptions`, mit Klartext-Vorschau:

```
Feld [ architecturalRole ▾ ]  erlaubte Werte [ Backend ✕ ][ Fullstack ✕ ][+]  ✕
[+ Bedingung]      Vorschau: „Sichtbar, wenn Architectural Role = Backend oder Fullstack"
```

**Metadaten-Optionen-Editor** (Detailbereich der Metadaten-Kategorie): editierbare Listen für
`executionType`, `architecturalRole` usw. (Label + Beschreibung), ersetzt den heutigen
statischen Info-Text (`QuestionnaireConfig.vue:143-148`).

### 4.5 Interaktionsregeln

| Aktion | Verhalten |
|--------|-----------|
| Speichern | `validateCatalog` läuft; bei **Fehlern** (z. B. doppelte IDs) blockiert, Befunde im Validierungspanel. Bei nur Warnungen erlaubt. Erfolg → `version` +1, Snackbar „Katalog gespeichert", **kein** `alert()`. |
| Tab/Editor verlassen mit Dirty-State | Vuetify-Dialog *Speichern / Verwerfen / Abbrechen*. |
| Löschen (Kategorie/Entry/Beispiel) | Sofort ausführen, Undo-Snackbar (5 s). Kein `confirm()`. Bei Kategorien mit Entries Hinweis „enthält N Entries". |
| Titel/Aspekt ändern | ID bleibt unverändert; separater Button „⟳ ID neu" mit Warnhinweis (Referenzen/Instanzen können brechen). |
| Neues Element | wird selektiert, Titel-Feld fokussiert und vorselektiert; Enter im letzten Beispiel-Feld legt die nächste Zeile an. |
| Validierung | Live-Panel unten: leere Pflichtfelder, doppelte IDs/Aspekte, `appliesTo` mit unbekannten Feldern/Werten, fehlende/mehrfache Metadaten-Kategorie. |

---

## 5. Restrukturierung

### 5.1 Neue Komponentenstruktur

`QuestionnaireConfig.vue` (Monolith) wird abgelöst durch einen Katalog-Editor:

```
Client/src/components/catalog/
├─ CatalogLibrary.vue          Bibliotheks-Ansicht / Einbindung in TreeNav
├─ CatalogEditor.vue           Container: Kopfzeile, Dirty-State, Save/Undo, Layout
├─ EditorTree.vue              Strukturbaum: Suche, Drag & Drop, Kontextmenüs
├─ CategoryForm.vue            Kategorie-Stammdaten + Entry-Kurzliste
├─ EntryForm.vue               Aspekt, ID, Beschreibung + eingebettete Editoren
├─ ExamplesEditor.vue          sortierbare Beispiel-Zeilen inkl. Tools-Chips
├─ AppliesToEditor.vue         Bedingungs-Editor (Kategorie + Entry)
├─ MetadataOptionsForm.vue     Editor für metadataOptions der Metadaten-Kategorie
└─ ValidationPanel.vue         Live-Validierungsergebnisse

Client/src/components/common/
├─ ConfirmDialog.vue           Promise-basiert (useConfirm()), ersetzt window.confirm
└─ UndoSnackbar.vue            Snackbar mit Undo-Aktion, ersetzt alert()
```

### 5.2 Store-Änderungen (`workspaceStore.js`)

Die Store-Umbauten dienen zugleich der Stabilisierung des Gesamtsystems (vgl.
`docs/refactoring.md` §1.1): Persistenz-, Migrations- und Katalog-Logik werden als
**reine, einzeln testbare Module** extrahiert, der Store behält State + Orchestrierung.

- **Modul-Extraktion (✅ erledigt 2026-07-17, s. Phase 0/1):**
  - `src/stores/workspaceFactories.js` — reine `createId`/`createWorkspace`/`createProject`/
    `createQuestionnaire`.
  - `src/stores/persistence.js` — Laden/Speichern (localStorage + Electron), `buildSnapshot`.
    Backup-Handling vor Migrationen (§3.3.1) folgt mit Schritt 6.
  - `src/stores/migrations.js` — `migrateProjectRadar`, `buildWorkspaceFromLegacyCategoriesFormat`.
    Die v1→v2-Katalogmigrationsstufe kommt mit Schritt 6 hinzu.
  - `src/services/catalogService.js` — **noch offen:** Katalog-CRUD + `instantiateCatalog`
    (Schritt 8).
- **Katalog-Bibliothek:** `workspace.catalogs[]` + CRUD (`addCatalog`, `renameCatalog`,
  `duplicateCatalog`, `deleteCatalog`, `updateCatalog`), `getCatalogById`.
- **Instanziierung:** `instantiateCatalog(catalogId)` erzeugt aus einem Katalog einen
  Fragebogen (Kopie der Struktur + Default-Antworten, `catalogId`/`catalogVersion` gesetzt).
  `addQuestionnaire`/`addProject`/`importProject` nutzen diese Funktion statt
  `getCategoriesData()` direkt.
- **Projekt:** `createProject`/`addProject` um `defaultCatalogId` erweitern; Projekt-Anlegen-Flow
  übergibt den gewählten Katalog.
- **Editor-Drafts:** `catalogDrafts` (Map Katalog-ID → Draft + dirty-Flag), damit ein Draft
  Tab-Wechsel übersteht; einfacher Undo-Stack (Snapshot vor jeder Strukturoperation, Tiefe ~20).
- **ID-Vergabe zentralisieren:** `generateId()` aus `QuestionnaireConfig.vue` in eine Util
  verschieben, bei Kollision Suffix `-2`, `-3`.
- **Ladepfad härten (B1):** tolerantes Laden, Seed nur bei leerem Speicher, Backup vor
  Migration, Fehlerzustand in der UI (§3.3.1). `STORAGE_VERSION` wird auf 2 erhöht, aber
  **erst nachdem** die Migrationskette und die Fixtures aus §6.2 grün sind.

### 5.3 Schema und Validierung

```
Client/src/schema/
├─ catalog.schema.json         JSON Schema der Katalogstruktur (§3.2)
└─ catalogValidation.js        validateCatalog(catalog) → { errors[], warnings[] }
```

Validator wird im Editor (Speichern), beim Import und in Unit-Tests gegen den
Standardkatalog aufgerufen (§6.4).

### 5.4 Änderungen an bestehenden Dateien

| Datei | Änderung |
|-------|----------|
| `categoriesService.js` | Bleibt Seed-Quelle **eines** Katalogs (Standard-Katalog), nicht mehr globaler Datenlieferant. `statusOptions`/`applicabilityOptions` wandern konzeptionell in den Katalog (s. Offene Punkte). |
| `workspaceStore.js` | s. §5.2; zusätzlich Persistenz/Migrationen in eigene Module extrahieren. |
| `Workspace.vue` | `v-dialog` + `configOpen`/`openConfig`/`updateCategories` entfernen. Katalog-Editor als eigener Tab-Typ neben `questionnaire` und `project-summary`; Tab-Wechsel/Schließen prüft Editor-Dirty-State. |
| `Questionnaire.vue` | Zahnrad-Button + `open-config`-Emit (Zeile 47-55) entfernen — Strukturbearbeitung passiert im Katalog-Editor, nicht mehr im Fragebogen. |
| `TreeNav.vue` | Neuer Bereich „Fragenkataloge" (§4.1); „+ Projekt" um Katalogauswahl-Dialog (§4.2) erweitern. |
| `ProjectSuggestions.vue` / Projektkomponenten | Wo Fragebögen erzeugt/importiert werden, `instantiateCatalog` bzw. `defaultCatalogId` berücksichtigen. |

### 5.5 Umsetzungsphasen

**Phase 0 — Sicherheitsnetz (vor jeder Datenmodell-Änderung, §6) — abgeschlossen (2026-07-17)**
1. ✅ Kompatibilitäts-Fixtures eingefroren: `v1-workspace-full.json`,
   `v1-workspace-legacy-radar.json`, `v1-categories-only.json` unter `tests/data/storage/`.
2. ✅ Golden-Master-Tests für Laden/Migration/Re-Persist (§6.2) in `storageCompat.spec.js`.
3. ✅ `npm run test:unit` in beide CI-Workflows aufgenommen (Lücke L1 geschlossen).
4. ✅ Ladepfad gehärtet (B1, §1.5): Seed nur bei leerem Speicher, `workspaceLoadError` +
   Fehlerdialog statt stillem Überschreiben, `persist()` blockiert im Fehlerzustand.
   Backup vor Migration und die eigentliche Migrationskette bleiben Phase 1 vorbehalten
   (aktuell keine ältere Version zu migrieren).

**Phase 1 — Fundament (Datenmodell & Schema)**
5. ✅ **Erledigt (2026-07-17):** `workspaceFactories.js` (reine `createId`/`createWorkspace`/
   `createProject`/`createQuestionnaire`), `migrations.js` (`migrateProjectRadar`,
   `buildWorkspaceFromLegacyCategoriesFormat`) und `persistence.js` (localStorage-/
   Electron-I/O, `buildSnapshot`) aus `workspaceStore.js` extrahiert (§5.2). Reiner
   Strukturumbau ohne Verhaltensänderung — abgesichert durch die 134 Tests aus Phase 0,
   die unverändert grün blieben.
6. ✅ **Erledigt (2026-07-17):** `workspace.catalogs[]` eingeführt; `migrateWorkspaceToV2`
   (`migrations.js`) fügt beim Laden eines v1-Datensatzes additiv den Standard-Katalog
   (`catalog-standard`) hinzu und stampft `defaultCatalogId` auf Projekte — idempotent,
   Fragebögen bleiben unangetastet (Entscheidung zu offenem Punkt 6: als reine
   Legacy-Instanzen belassen, **keine** `catalogId`-Provenienz erfunden). `STORAGE_VERSION`
   auf 2 erhöht; `applyStoredData` akzeptiert weiterhin Version 1 **und** 2 (§3.3.1
   „tolerantes Laden"), Version 1 wird beim Laden migriert.
7. ✅ **Erledigt:** `src/schema/catalog.schema.json` (Draft 2020-12, Dokumentationsgrundlage)
   und `src/schema/catalogValidation.js` (`validateCatalog` — Fehler für Pflichtfelder/
   Duplikate/Metadaten-Kategorie-Anzahl, Warnungen für `appliesTo`-Inkonsistenzen). Der
   mitgelieferte Standardkatalog ist gegen die Regeln geprüft (Fixture-Test, 24 Tests in
   `catalogValidation.spec.js`/`catalogService.spec.js`).
8. ✅ **Erledigt:** `src/services/catalogService.js` mit `instantiateCatalog(catalog, name)`
   (deep-clone, füllt `answers`/`applicability` via `normalizeCategories` auf, setzt
   `catalogId`/`catalogVersion`) und `buildStandardCatalogFromSeed`. `addQuestionnaire`
   nutzt `instantiateCatalog` mit dem `defaultCatalogId` des Projekts (Fallback: erster
   Katalog der Bibliothek, dann On-the-fly-Standardkatalog), sobald keine expliziten
   `categories` übergeben werden — das betrifft den „+ Fragebogen"-Flow in `TreeNav.vue`.
   `importProject` bleibt unverändert: importierte Fragebögen tragen im heutigen
   Exportformat keine Katalog-Provenienz und bleiben Legacy-Instanzen; das wird erst in
   Phase 2 relevant, wenn der Export katalogbewusst wird.

   **Bewusst zurückgestellt auf Phase 2:** volle Katalog-CRUD im Store (`addCatalog`,
   `renameCatalog`, `duplicateCatalog`, `deleteCatalog`, `updateCatalog`) — ohne Bibliotheks-UI
   als Aufrufer wäre das ungenutzter Code. `getCatalogById` existiert bereits (von
   `addQuestionnaire` benötigt).

**Phase 2 — Katalogauswahl & Bibliothek**
9. `defaultCatalogId` in Projekt (Datenfeld existiert bereits, s. Schritt 6); „+ Projekt"-Dialog
   mit Katalogauswahl (§4.2) und Katalog-CRUD im Store fehlen noch.
10. `CatalogLibrary` in `TreeNav` (§4.1): Liste, Anlegen, Duplizieren, Umbenennen, Löschen, Export.

**Phase 3 — Editor als eigener Arbeitsbereich**
11. `CatalogEditor` + `EditorTree`, Modal in `Workspace.vue` entfernen, Katalog-Editor-Tab (P1/P11).
12. `catalogDrafts` im Store, Dirty-Guard bei Tab-Wechsel/-Schließen (P2).
13. `alert()`/`confirm()` durch `ConfirmDialog` + `UndoSnackbar` ersetzen (P3/P10).
14. Automatische ID-Regeneration entfernen, expliziter „⟳ ID neu"-Button (P6).

**Phase 4 — Vollständigkeit des Datenmodells**
15. `EntryForm` mit `description`; `ExamplesEditor` mit `tools`-Chips (P7).
16. `AppliesToEditor` für Kategorie + Entry (P7).
17. `MetadataOptionsForm` für die Metadaten-Kategorie (P7).
18. `ValidationPanel` mit Live-Befunden (P8).

**Phase 5 — Komfort**
19. Drag & Drop via `vuedraggable` (Baum + Beispiele), Entries zwischen Kategorien verschieben (P5).
    Fallback bis dahin: Auf/Ab-Buttons im Knoten-Menü.
20. Undo/Redo-Stack, Duplizieren von Kategorien/Entries (P10).
21. Tastatur-Flows (Enter = nächste Zeile, Cmd/Ctrl+S = Speichern).

**Neue Abhängigkeit:** `vuedraggable@next` (Vue-3-Wrapper um Sortable.js) für Phase 5;
optional, da Auf/Ab-Buttons als Fallback existieren.

**Gate zwischen den Phasen:** Eine Phase gilt erst als abgeschlossen, wenn alle
Kompatibilitätstests (§6.2) und die bestehenden Unit-/E2E-Suiten grün sind.

### 5.6 Akzeptanzkriterien (Auszug)

Funktional:

- [ ] Mehrere Kataloge lassen sich in der Bibliothek anlegen, umbenennen, duplizieren, löschen; ein referenzierter Katalog kann nicht gelöscht werden.
- [ ] Beim Anlegen eines Projekts wird ein Default-Katalog gewählt; der erste Fragebogen wird daraus instanziiert und im Projekt gespeichert.
- [ ] Ein Katalog wird beim Speichern und beim Import gegen `catalog.schema.json` validiert; Fehler blockieren das Speichern.
- [ ] Schließen des Editors mit ungespeicherten Änderungen zeigt immer den Speichern/Verwerfen-Dialog.
- [ ] Kein `window.alert` / `window.confirm` mehr im Client-Code.
- [ ] Umbenennen einer Kategorie/eines Entries ändert dessen ID nicht; ausgeblendete Entries bleiben ausgeblendet.
- [ ] `entry.description`, `example.tools`, `appliesTo` und `metadataOptions` sind ohne JSON-Export editierbar.
- [ ] Ein Katalog mit 10 Kategorien à 20 Entries ist ohne Volltext-Scrolling navigierbar (Baum + Suche).
- [ ] Löschen einer Kategorie ist 5 Sekunden per Undo rücknehmbar.

Abwärtskompatibilität (verbindlich, Nachweis über §6.2):

- [ ] Ein v1-Workspace (localStorage **und** Electron-Datei) lädt nach dem Umbau verlustfrei: alle Projekte, Fragebögen, Antworten, Kommentare, Applicability-Werte, Radar-Daten, ausgeblendete Entries und offenen Tabs sind unverändert vorhanden.
- [ ] Die Migration ist idempotent: zweimaliges Laden/Migrieren erzeugt denselben Zustand.
- [ ] Vor der ersten Persistierung im neuen Format existiert ein Backup des Alt-Stands.
- [ ] Ein Datensatz mit *neuerer* Version oder Parse-Fehler wird **nie** durch einen Seed ersetzt oder überschrieben; die UI zeigt einen Fehlerzustand, Autosave bleibt aus.
- [ ] Projekt-/Fragebogen-Exporte aus v1.11 (u. a. `tests/data/golden_sample_project.json`) lassen sich unverändert importieren; Fragebögen ohne `catalogId` funktionieren vollständig (Ausfüllen, Radar, Matrix, Vergleich, Export).
- [ ] Das Projekt-Exportformat behält seine Grundstruktur; neue Felder sind additiv.

---

## 6. Teststrategie

Ziel: Die Katalog-Einführung und die begleitenden Refactorings dürfen Bestandsdaten und
bestehendes Verhalten nicht beschädigen. Die Strategie kombiniert eingefrorene
Kompatibilitäts-Fixtures (Golden Master), Unit-Tests auf den extrahierten Modulen und die
vorhandenen E2E-Szenarien — und verankert alles in der CI.

### 6.1 Testebenen im Überblick

| Ebene | Werkzeug | Gegenstand | Status |
|-------|----------|------------|--------|
| Kompatibilität / Golden Master | Vitest + eingefrorene Fixtures | Laden, Migration, Re-Persist alter Speicherstände | **neu (§6.2)** |
| Unit | Vitest | `migrations.js`, `persistence.js`, `catalogService`, `validateCatalog`, Store-Logik | teils vorhanden, ausbauen |
| Komponenten | Vitest + @vue/test-utils | Editor-Formulare, Dirty-Guard, ConfirmDialog/UndoSnackbar | neu mit Phase 3 |
| E2E | Cucumber/Playwright | Nutzer-Flows inkl. Import alter Export-Dateien | vorhanden, +2 Szenarien |
| CI | GitHub Actions | Unit **und** E2E als Pflicht-Gates | Unit-Step fehlt (L1) |

### 6.2 Kompatibilitäts-Fixtures (Golden Master) — das Herzstück

Unter `Client/tests/data/storage/` werden **reale, eingefrorene Payloads** abgelegt. Diese
Dateien sind Verträge: Sie werden **nie angepasst**, nur um neue Versionen ergänzt.

Fixtures (mindestens):

1. `v1-workspace-full.json` — heutiges Format (`version: 1`, `workspace` mit Projekten,
   Fragebögen inkl. Antworten/Kommentaren/Applicability, `radar`, `radarCategoryOrder`,
   `questionnaireHiddenEntries`, offenen Tabs). Aus einer echten Session erzeugt.
2. `v1-workspace-legacy-radar.json` — Projekt mit `radarRefs`/`radarOverrides`
   (prüft `migrateProjectRadar` in der Kette).
3. `v1-categories-only.json` — das älteste Format (`version: 1`, nur `categories`,
   Zweig `applyStoredData`, `workspaceStore.js:146-156`).
4. `export-project-v1_11.json` — Projekt-Export des heutigen Formats
   (`tests/data/golden_sample_project.json` bleibt als E2E-Fixture bestehen und wird hier
   mitverwendet).
5. Nach der Katalog-Einführung zusätzlich: `v2-workspace-with-catalogs.json`.

Testfälle je Fixture (Vitest, `tests/unit/storageCompat.spec.js`):

- **Verlustfreiheit:** Nach `loadFromData(fixture)` sind alle Nutzdaten-Invarianten erfüllt —
  Anzahl/IDs/Namen von Projekten und Fragebögen, jede Antwort (`technology`, `status`,
  `comments`, `answerType`), `entryComment`, `applicability`, Metadatenwerte, Radar-Einträge,
  `radarCategoryOrder`, ausgeblendete Entries. Vergleich per Deep-Snapshot der Nutzdaten
  (nicht des Gesamtobjekts, damit additive Felder erlaubt bleiben).
- **Idempotenz:** `migrate(migrate(fixture)) === migrate(fixture)` (Deep-Equal).
- **Re-Persist & Reload:** migrierten Zustand persistieren, mit frischem Store laden ⇒
  identische Nutzdaten (Round-Trip über das *neue* Format).
- **Kein Seed über Daten (B1):** Payload mit `version: 999` bzw. kaputtem JSON ⇒ Workspace
  bleibt leer/Fehlerzustand, `persist()` wird nicht ausgelöst, localStorage/Datei unverändert;
  Fehlerzustand-Flag gesetzt.
- **Backup:** Erste Migration erzeugt Backup-Eintrag/-Datei mit dem unveränderten Alt-Stand.
- **Legacy-Instanzen:** Fragebogen ohne `catalogId` durchläuft `normalizeCategories`,
  ist ausfüllbar (`addAnswer`, `setApplicability`) und exportierbar.

### 6.3 Charakterisierungstests vor Refactoring

Vor der Extraktion von `persistence.js`/`migrations.js` (Phase 1) und vor dem Umbau von
`addQuestionnaire`/`importProject` auf `instantiateCatalog`:

- Bestehende Suiten (`workspaceStore.spec.js`: „legacy radar migration",
  „persistence round-trip", „normalizeCategories") gelten als Charakterisierung und müssen
  unverändert grün bleiben — sie dürfen beim Refactoring nicht „mit angepasst" werden.
- Wo Verhalten heute unspezifiziert ist (z. B. `data.categories`-Zweig), wird es **vor** dem
  Umbau per Test festgeschrieben (Phase 0, Schritt 2).

### 6.4 Neue Unit-Tests für Katalog-Funktionalität

- `catalogValidation.spec.js`: Schema-Regeln aus §3.2 (Pflichtfelder, ID-Muster, doppelte
  IDs, genau eine Metadaten-Kategorie, `appliesTo`-Konsistenz); **Standardkatalog aus
  `getCategoriesData()` ist schema-gültig** (Fixture-Prüfung).
- `catalogService.spec.js`: `instantiateCatalog` erzeugt Instanz mit Default-Antworten,
  ohne Antworten im Katalog zu hinterlassen (keine geteilten Referenzen — Deep-Clone-Test);
  `deleteCatalog` blockiert bei referenzierendem Projekt; `generateId`-Kollisionsbehandlung.
- `migrations.spec.js`: jede Migrationsstufe isoliert (reine Funktion, Input → Output).

### 6.5 E2E-Ergänzungen (Cucumber/Playwright)

Zusätzlich zu den 9 bestehenden Szenarien:

1. **„Altprojekt importieren":** Import von `golden_sample_project.json` (v1.11-Export) ⇒
   Projekt erscheint, Fragebogen ist ausfüllbar, Radar funktioniert. (Erweitert das
   bestehende Import-Szenario um explizite Alt-Format-Zusicherung.)
2. **„Workspace-Upgrade":** localStorage vor App-Start mit `v1-workspace-full.json` befüllen
   (Playwright `addInitScript`), App laden ⇒ alle Projekte/Antworten sichtbar, Backup-Key
   vorhanden, nach Reload weiterhin konsistent.
3. Mit Phase 3: Katalog anlegen → Projekt mit Katalog → Fragebogen instanziieren → ausfüllen.

### 6.6 CI-Härtung

- `npm run test:unit` als eigener Step **vor** dem E2E-Lauf in `ci-dev.yml` und
  `build-and-deploy.yml` (schließt L1; ohne CI-Verankerung ist die gesamte Strategie wirkungslos).
- Kompatibilitätstests laufen in jedem PR; ein eigener, klar benannter Vitest-`describe`-Block
  („storage compatibility") macht Verstöße im CI-Log sofort erkennbar.
- Optional (empfohlen, vgl. `docs/refactoring.md` §2.3): ESLint-Step, um die neuen Module
  von Beginn an abzusichern.

---

## 7. Offene Punkte

1. **Status-/Applicability-Vokabular pro Katalog?** Heute sind `statusOptions`
   (`categoriesService.js`) und `applicabilityOptions` (`workspaceStore.js:1004`) global.
   Sollen sie pro Katalog definierbar sein (verschiedene Kataloge, verschiedene Statuswerte)
   oder global bleiben? Das Zielmodell (§3.1) sieht sie am Katalog vor — final zu entscheiden.
   *Hinweis:* Die Statuswerte sind zusätzlich an mehreren Stellen hartkodiert
   (`techRadarExport.js`, `TechRadar.vue`, `CustomHtmlExportDialog.vue`,
   `MCP/McpServer/Services/JsonSchemas.cs`, vgl. `docs/refactoring.md` §1.3) — vor einer
   Pro-Katalog-Entscheidung erst zentralisieren.
2. **Propagation von Katalogänderungen.** Bereits instanziierte Fragebögen sind Kopien. Wird
   ein Katalog nach Instanziierung geändert, aktualisieren sich bestehende Fragebögen **nicht**.
   Braucht es einen „Auf neue Katalogversion aktualisieren"-Mechanismus (Diff der Struktur,
   Antworten erhalten)? `catalogVersion` am Fragebogen legt die Grundlage.
3. **Antworten beim Löschen von Struktur.** Löscht man im Katalog einen Entry, betrifft das nur
   die Vorlage. Auf Fragebogen-Ebene (falls dort später doch Strukturänderungen erlaubt werden):
   „archivieren statt löschen", wenn Antworten existieren?
4. **Referenzkataloge im Projektvergleich.** Wird ein Fragebogen als Referenz markiert
   (`Questionnaire.vue:400-407`), sollten Katalog-/Strukturänderungen einen Hinweis auf die
   Auswirkung auf den Vergleich zeigen.
5. **Mehrsprachigkeit.** Editor-UI ist Englisch, Teile des Fragebogens Deutsch
   (`Questionnaire.vue:175-181`). Sprache vereinheitlichen?
6. **Entscheidung Migrationsvariante (§3.3.2, Schritt 2):** Bestehende Fragebögen mit
   `catalogId`-Provenienz versehen oder als reine Legacy-Instanzen belassen? Zu entscheiden
   in Phase 0 anhand der Fixture-Tests.
