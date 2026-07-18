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
- **2026-07-17 (Nachtrag):** Phase 0 und Phase 1 umgesetzt (Sicherheitsnetz, Katalog-Datenmodell,
  siehe Statusvermerke in §5.5). Neue Phase „Standardkatalog-Konsistenzprüfung" eingefügt
  (inhaltliche Prüfung des mitgelieferten Katalogs, überwiegend Domänenwissen statt Code) —
  ursprünglich als Phase 2 direkt nach dem Fundament vorgesehen, auf Wunsch aber als
  **letzte** Phase (jetzt Phase 6) einsortiert: Die Prüfung profitiert davon, dass der
  Katalog-Editor (Phase 3) bereits existiert, wenn Befunde behoben werden müssen — dafür ist
  der Standardkatalog schon ab Phase 2 (Bibliothek) für echte Projekte nutzbar, bevor er
  inhaltlich durchgeprüft ist. Phase „Katalogauswahl & Bibliothek" (jetzt Phase 2) umgesetzt.
- **2026-07-18 (Nachtrag):** Phasen 2–5 abgeschlossen; Phase 6 umgesetzt — jedoch **auf
  Nutzerwunsch als zusätzlicher, interviewgerechter Katalog** statt als Konsistenz-Review des
  Standardkatalogs in place (Details in §5.5 Phase 6). Der neue Katalog „Software System
  Interview" strukturiert Interviews zu Softwaresystemen und trennt Practices (→ Referenz­-
  architekturen) von Tools (→ Toolchains). Damit sind alle geplanten Phasen abgeschlossen.

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
      └─ examples[]  { type: 'practice' | 'tool', label, description }
         ← Praxis und Tool sind unabhängige, gleichrangige Beispiele in
           derselben flachen Liste (Nachtrag 2026-07-17, s. §3.1a) — kein
           Tool muss mehr einer bestimmten Practice zugeordnet werden.

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

### 3.1a Nachtrag zu Phase 4: Practice- und Tool-Beispiele entkoppelt (2026-07-17)

**Problem:** Der in Phase 4 gebaute `ExamplesEditor` bildete `example.tools[]` weiterhin als
verschachtelte Liste *unter* einem Practice-Beispiel ab (Erbe des ursprünglichen Datenmodells,
§1.3 P7). Ein eigenständiges Tool-Beispiel ganz ohne zugehörige Practice ließ sich damit nicht
anlegen — man musste eine künstliche Practice erfinden, nur um ein Tool unterzubringen (z. B.
„Testing Tools" als Fake-Practice, um Jest/Playwright/Postman als deren `tools[]` zu listen).

**Lösung:** `example` bekommt ein `type`-Feld (`'practice' | 'tool'`). Ein Entry hat weiterhin
nur **eine** flache `examples[]`-Liste, aber Practice- und Tool-Beispiele sind vollständig
unabhängig voneinander editierbar — kein erzwungenes Pairing mehr. `ExamplesEditor.vue` hat
zwei Buttons („Add practice" / „Add tool") statt der bisherigen verschachtelten Tools-Chips.

**Kompatibilitätsstrategie — bewusst *keine* Massenmigration:** Anders als bei
`STORAGE_VERSION`-Sprüngen (§3.3) wird hier **nichts an bestehenden Daten umgeschrieben**.
Begründung: Ein Rewrite beim Laden hätte den Export/Import-Rundlauf-Test (`tests/data/
golden_sample_project.json`, exaktes Byte-Match) gebrochen und wäre unnötig riskant für ein
rein additives Editor-Feature gewesen. Stattdessen:

- **Lesend** (`getSuggestions()` in `Questionnaire.vue`, `EntryExamples.vue`): Beide Formen
  werden toleriert über `expandExamplesToTyped()` (`catalogService.js`) — ein untypisiertes
  Legacy-Beispiel `{label, description, tools[]}` wird zur Laufzeit (nicht persistiert) in ein
  Practice-Beispiel plus je ein Tool-Beispiel pro `tools[]`-Eintrag expandiert. Bestehende
  Fragebögen/Kataloge funktionieren unverändert, für immer, ganz ohne Migration.
- **Editierend** (`CatalogEditor.vue`/`ExamplesEditor.vue`): Beim Öffnen eines Katalog-Entwurfs
  (`workspaceStore.js openCatalogEditor`) wird der Entwurf **einmalig, vor dem Dirty-Watch**,
  über `migrateCategoriesExamplesToTyped()` normalisiert — der Editor zeigt also immer die
  typisierte Form, aber rein lesendes Öffnen markiert den Tab nie fälschlich als „unsaved" (der
  Watch hängt erst danach ein). Der gespeicherte Katalog ändert sich nur, wenn der Nutzer
  tatsächlich „Save" klickt — exakt dasselbe Draft/Dirty-Modell wie jede andere Bearbeitung.
  Ein Katalog konvergiert damit graduell zur neuen Form, sobald er im Editor bearbeitet wird;
  nie durch einen erzwungenen Hintergrundprozess.
- **Schema/Validator** (`catalog.schema.json`, `catalogValidation.js`): `type` ist optional —
  ein fehlendes `type` ist kein Fehler (Altbestand bleibt gültig), nur ein falscher Wert
  (`type` gesetzt, aber weder `'practice'` noch `'tool'`) wird als Fehler gemeldet.

**Warum das robuster ist als eine `STORAGE_VERSION`-Migration:** Nichts an Daten in
localStorage/Electron-Dateien wird jemals außerhalb einer expliziten Nutzeraktion (Katalog
speichern) umgeschrieben — die im Auftrag genannte Härte-Anforderung („bestehende Projekte …
müssen nach den Anpassungen immer noch funktionieren") ist damit strukturell erfüllt, nicht nur
getestet.

### 3.2 Katalog-Schema

Ein verbindliches Schema (`catalog.schema.json`, JSON Schema Draft 2020-12) beschreibt die
gültige Katalogstruktur und dient als Prüf- und Dokumentationsgrundlage. Verbindliche Regeln
(Auszug):

- **Katalog:** `id`, `name`, `version`, `schemaVersion`, `categories` (min. 1) erforderlich;
  genau **eine** Kategorie mit `isMetadata: true`.
- **Kategorie:** `id`, `title` erforderlich; `id` eindeutig im Katalog, Muster
  `^[a-z0-9-]+$`. Nicht-Metadaten-Kategorien haben `entries`.
- **Entry:** `id`, `aspect` erforderlich; `id` eindeutig **innerhalb der Kategorie**.
- **Example:** `label` erforderlich; `type` optional (`'practice' | 'tool'` wenn gesetzt, s.
  §3.1a). Legacy-Form mit `tools` (optionales String-Array) statt `type` bleibt gültig.
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

#### 3.3.2a Migrationsschritt v2 → v3 (Interview-Zusatzkatalog) — ✅ erledigt (2026-07-18)

Phase 6 liefert einen zweiten eingebauten Katalog aus (`id: 'catalog-interview'`, s. Phase 6
in §5.5). Er wird — wie schon der Standardkatalog in v2 — über einen versionsgebundenen,
idempotenten Migrationsschritt in Bestandsworkspaces eingebracht:

1. **`STORAGE_VERSION` von 2 auf 3.** `SUPPORTED_STORAGE_VERSIONS` wird explizit auf
   `[1, 2, 3]` gesetzt — **kritisch**: Würde man beim Bump die 2 weglassen, sähen alle real
   gespeicherten v2-Workspaces plötzlich „unsupported" aus und lösten den B1-Fehlerpfad (§1.5)
   auf echten Nutzerdaten aus.
2. **`migrateWorkspaceToV3` — add-if-missing.** Fügt den Interview-Katalog nur hinzu, wenn
   noch keiner mit dieser id vorhanden ist. Rein additiv, kein bestehendes Feld ändert seine
   Form.
3. **Ladepfad wendet alle fälligen Schritte an.** `runWorkspaceMigrations(fromVersion)` führt
   je nach Ausgangsversion die passende Kette aus: v1 → v2 (Standardkatalog + `defaultCatalogId`)
   **und** v3 (Interview-Katalog); v2 → nur v3; v3 → keine. Das älteste `data.categories`-Format
   durchläuft die volle Kette ab v1.
4. **Löschen bleibt bestehen.** Da der Schritt nur beim Hochmigrieren einer < v3-Workspace
   läuft (danach wird v3 persistiert), wird ein vom Nutzer gelöschter Interview-Katalog **nicht**
   bei jedem Laden neu eingespielt — anders als eine „bei jedem Load sicherstellen"-Lösung es
   täte. Genau diese Eigenschaft macht den Katalog zu einem normalen, verwaltbaren
   Bibliothekseintrag statt zu einem unlöschbaren Built-in.

Abgesichert durch die v2→v3-Tests in `storageCompat.spec.js` (idempotent; „v3 mit gelöschtem
Katalog re-addet nicht"; v1 landet bei beiden Katalogen; Round-Trip schreibt jetzt v3).

#### 3.3.2b Auffrischung eingebauter Kataloge (`refreshBuiltInCatalogs`) — ✅ erledigt (2026-07-18)

Die reine „add-if-missing"-Migration (§3.3.2a) hat eine Nebenwirkung, die beim Weiterentwickeln
auffiel: Wurde ein eingebauter Katalog **einmal** in einen Workspace geschrieben und danach im
Code inhaltlich erweitert (z. B. der Interview-Katalog von 36 → 72 Fragen), blieb die gespeicherte
Kopie auf dem alten Stand „eingefroren" — die Migration läuft ja bei bereits-v3-Workspaces nicht
erneut. Ergebnis beim Nutzer: veralteter Katalog (36 statt 72 Fragen).

`refreshBuiltInCatalogs()` (läuft bei **jedem** Laden in `applyStoredData`, nicht versionsgebunden)
löst das, ohne die „Edits/Löschungen bleiben erhalten"-Garantie zu verletzen. Ein eingebauter
Katalog (per fixer id erkannt) wird nur dann aus dem aktuellen Seed aufgefrischt, wenn er
**unangetastet** ist:

- `version` entspricht noch der ausgelieferten Basis (Bearbeiten im Editor erhöht sie via
  `saveCatalogDraft`), **und**
- `name` entspricht noch dem Seed-Namen (Umbenennen in der Bibliothek ändert ihn),
- und der Inhalt tatsächlich abweicht (sonst kein unnötiges Neuschreiben).

Trifft eins der Ownership-Signale nicht zu (umbenannt oder editiert), bleibt der Katalog
unangetastet. Gelöschte Kataloge sind nicht vorhanden und werden nicht wieder eingespielt. Die
aufgefrischte Fassung wird beim Laden **einmalig** persistiert (`initFromStorage` ruft `persist()`,
wenn tatsächlich aufgefrischt wurde) — nötig, weil der Autosave-Watcher erst *nach* dem Laden
eingerichtet wird und die Mutation sonst verpasst. Abgesichert durch vier Tests in
`storageCompat.spec.js` („frischt veraltete pristine Kopie auf"; „editierte (version↑) bleibt";
„umbenannte bleibt"; „aktuelle wird nicht unnötig neu geschrieben"). *Hinweis:* Nutzer-eigene
Duplikate (eigene id, z. B. „Standard Catalog Copy") sind hiervon nicht betroffen und über das
Knotenmenü löschbar.

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
├─ CatalogLibrary.vue          ✅ realisiert direkt in TreeNav.vue statt als eigene Komponente
├─ CatalogEditor.vue           ✅ Container: Kopfzeile, Dirty-State, Save/Undo, Layout
├─ EditorTree.vue              ✅ Strukturbaum: Suche, Kontextmenüs, Auf/Ab **und** Drag & Drop
├─ CategoryForm.vue            ✅ Kategorie-Stammdaten + Entry-Kurzliste
├─ EntryForm.vue               ✅ Aspekt, ID, Description, Beispiele (via ExamplesEditor), appliesTo
├─ ExamplesEditor.vue          ✅ flache Liste, je Zeile Type (Practice/Tool)/Label/Description
├─ AppliesToEditor.vue         ✅ Kategorie + Entry (gleiche Komponente, Prop `target`)
├─ MetadataOptionsForm.vue     ✅ editierbare metadataOptions-Optionen der Metadaten-Kategorie
└─ ValidationPanel.vue         ✅ Live-Panel (löst den On-Demand-Bericht aus Phase 3 ab)

Client/src/composables/
├─ useConfirm.js               ✅ Promise-basiert, Singleton-State
├─ useUndoSnackbar.js          ✅ Singleton-State
└─ useWorkspaceTabGuard.js     ✅ gemeinsamer Dirty-Guard für Tableiste UND Seitenbaum

Client/src/components/common/
├─ ConfirmDialog.vue           ✅ ersetzt window.confirm, einmal in App.vue gemountet
└─ UndoSnackbar.vue            ✅ ersetzt alert(), einmal in App.vue gemountet
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

**Phase 2 — Katalogauswahl & Bibliothek — ✅ abgeschlossen (2026-07-17)**
9. ✅ `createProject`/`addProject` um `defaultCatalogId` erweitert; „+ Projekt"-Dialog
   (`TreeNav.vue`) zeigt Katalogauswahl (`v-select`) mit Kategorien-/Fragen-Zusammenfassung
   (`summarizeCatalog`, §4.2) und eine standardmäßig aktivierte Checkbox „Create first
   questionnaire from catalog" — erzeugt bei Bestätigung sofort einen Fragebogen via
   `instantiateCatalog`, benannt nach dem Katalog (nicht nach dem Projekt, um doppelt
   aussehende Baum-/Tab-Einträge zu vermeiden — per E2E-Lauf gefunden und korrigiert).
   Katalog-CRUD im Store ergänzt: `addCatalog`, `renameCatalog`, `duplicateCatalog`,
   `deleteCatalog` (blockiert mit Projektliste, falls referenziert), `exportCatalog`;
   `updateCatalog` bleibt zurückgestellt, bis der Editor (Phase 3) es braucht.
10. ✅ `CatalogLibrary`-Bereich in `TreeNav.vue` (§4.1, oberhalb der Projekte): Liste mit
    Kategorien-/Fragen-Zusammenfassung je Katalog, Kontextmenü (Duplizieren, Export,
    Umbenennen, Löschen), „+ Katalog"-Button. „Öffnen (Editor)" bewusst ausgelassen, da der
    Katalog-Editor erst Phase 3 baut.

    **Beim Testen gefunden und behoben:** Der neue Bibliotheksbereich fügte einen zweiten
    `.tree-actions`-Block *vor* dem Projekte-Bereich ein; zwei E2E-Step-Definitionen
    verließen sich auf `.tree-actions button` als erstes Element für den
    „New project"-Button und trafen nach der Änderung den neuen „New catalog"-Button.
    Behoben durch `aria-label`s auf beiden Buttons und `getByRole('button', { name })`
    in den Steps statt positionsbasierter Selektoren.

**Phase 3 — Editor als eigener Arbeitsbereich — ✅ abgeschlossen (2026-07-17)**
11. ✅ `CatalogEditor.vue` + `EditorTree.vue` als eigener Workspace-Tab (`Client/src/components/catalog/`).
    Master-Detail wie in §4.3 skizziert: Suchbarer Strukturbaum links (Kategorien aufklappbar,
    Entries als Kinder, Knotenmenü mit Duplizieren/Verschieben/Löschen), Detailformular rechts
    (`CategoryForm.vue`/`EntryForm.vue`). Kopfzeile mit Name, Version, Dirty-Chip,
    Speichern/Rückgängig, Sekundärmenü (JSON ansehen, Exportieren, Validierungsbericht,
    Alles zurücksetzen). Das `v-dialog`-Modal in `Workspace.vue` (`configOpen`/`openConfig`/
    `updateCategories`) ist entfernt; `QuestionnaireConfig.vue` gelöscht; Zahnrad-Button +
    `open-config`-Emit aus `Questionnaire.vue` entfernt (P1/P11 gelöst).
12. ✅ `catalogDrafts` (reaktive Map Katalog-ID → `{ draft, dirty }`) im Store, `openCatalogEditor`/
    `saveCatalogDraft`/`discardCatalogDraft`/`closeCatalogEditor`. Dirty-Tracking per Deep-Watch
    mit `flush: 'sync'` (Store schreibt beim Speichern/Verwerfen den Draft neu und löscht das
    Dirty-Flag in derselben Anweisung — mit dem default-batched Flush hätte der eigene Watcher
    das Flag sofort wieder gesetzt; siehe Kommentar in `workspaceStore.js`).
    Dirty-Guard (Speichern/Verwerfen/Abbrechen) über gemeinsames Composable
    `useWorkspaceTabGuard.js`, verwendet von **beiden** Navigationspfaden — Tableiste
    (`Workspace.vue`) **und** Seitenbaum (`TreeNav.vue`, `openProjectSummary`/`openQuestionnaire`/
    `openCatalog`). Der zweite Pfad fehlte im ersten Entwurf und wurde erst beim manuellen
    Browser-Test gefunden (Klick auf ein Projekt im Baum wechselte den Tab ohne Rückfrage,
    obwohl der Katalog-Tab ungespeicherte Änderungen hatte).
13. ✅ `ConfirmDialog.vue`/`UndoSnackbar.vue` (`Client/src/components/common/`) mit
    Promise-basierten Composables `useConfirm.js`/`useUndoSnackbar.js`, einmal in `App.vue`
    gemountet. Löschen (Kategorie/Entry) läuft sofort mit 5s-Undo-Snackbar statt `confirm()`.
    `QuestionnaireConfig.vue` war die einzige Datei mit `window.alert`/`window.confirm` im
    Client — mit ihrer Löschung ist das Client-weite Akzeptanzkriterium „kein `window.alert`/
    `window.confirm` mehr" bereits erfüllt.
14. ✅ Automatische ID-Regeneration entfernt; expliziter „New ID"-Button pro Kategorie/Entry mit
    Warn-Dialog („Referenzen/Instanzen können brechen") vor der Regenerierung.

    **Bewusst zurückgestellt auf Phase 4:** `appliesTo`-Editor, `tools`-Chips im
    Beispiel-Editor, editierbare `metadataOptions`, Live-`ValidationPanel` (P7/P8) — die
    Metadaten-Kategorie zeigt bis dahin nur eine schreibgeschützte Übersicht der
    `metadataOptions`-Felder; ein Validierungsbericht ist über das Sekundärmenü abrufbar
    (on-demand, nicht live).

    **Beim manuellen Browser-Test gefunden und behoben** (2 Bugs, keiner davon von den
    Unit-/E2E-Tests erkannt, da diese den Katalog-Editor bislang nicht abdeckten):
    - Neu hinzugefügte/ausgewählte Entries blieben im Baum unsichtbar, wenn ihre Kategorie
      eingeklappt war (Formular zeigte sie korrekt, der Baum nicht) — behoben durch
      automatisches Aufklappen der Kategorie der aktuellen Auswahl (`EditorTree.vue`).
    - Sidebar-Navigation (s. Punkt 12) umging den Dirty-Guard komplett.

**Phase 4 — Vollständigkeit des Datenmodells — ✅ abgeschlossen (2026-07-17)**
15. ✅ `EntryForm.vue` um `description`-Textarea erweitert; Beispiel-Bearbeitung an
    `ExamplesEditor.vue` ausgelagert (Label/Description/Reorder per Auf-/Ab-Buttons) (P7).
    **Ursprünglich** (2026-07-17, erste Fassung dieser Phase) mit `tools`-Chips nested unter
    jedem Beispiel gebaut — noch am selben Tag durch den Nachtrag in §3.1a ersetzt (flache
    Liste mit `type: 'practice' | 'tool'` statt Verschachtelung), nachdem der Nutzer auf die
    fehlende Unabhängigkeit von Tool- und Practice-Beispielen hinwies.
16. ✅ `AppliesToEditor.vue` — einklappbarer `appliesTo`-Editor für Kategorie **und** Entry
    (gleiche Komponente, Prop `target`). Bedingungen als Feld/Werte-Paare, Feldauswahl
    beschränkt auf noch unbenutzte `metadataOptions`-Felder, Klartext-Vorschau
    („Visible when Execution Type = Web Application or Desktop Application"). Löschen der
    letzten Bedingung eines Feldes entfernt den `appliesTo`-Schlüssel vollständig statt ein
    leeres Objekt zu hinterlassen (P7).
17. ✅ `MetadataOptionsForm.vue` — editiert `category.metadataOptions[field]` (Label +
    Description je Option) für die Metadaten-Kategorie; Hinweis-Alert, dass neue Feld-Keys
    ohne Wirkung bleiben, da das Ausfüllformular weiterhin fest auf `executionType`/
    `architecturalRole` liest (bewusste Scope-Entscheidung, keine generische Feld-Engine) (P7).
18. ✅ `ValidationPanel.vue` — Live-Panel unten im Editor (`validateCatalog(draft)` als
    Computed in `CatalogEditor.vue`), löst den bisherigen On-Demand-Bericht aus dem
    Sekundärmenü aus Phase 3 ab. Zeigt Fehler-/Warnungszahl in der Kopfzeile, aufklappbar zur
    Fundliste mit vollem Pfad (z. B. `categories[architecture].entries[arch-hlp].examples[4].label
    Example label is required`).

    16 neue Unit-Tests (`tests/unit/catalogSubEditors.spec.js`) für `AppliesToEditor`,
    `ExamplesEditor`, `MetadataOptionsForm` über deren `defineExpose`-Oberfläche (Store-los,
    da alle drei Komponenten nur auf ihre Props mutieren und keine Pinia-Abhängigkeit haben).
    Gesamte Unit-Suite danach 218/218 grün, `npm run lint` sauber, volle E2E-Suite
    (9 Szenarien/65 Schritte) grün, Produktions-Build (`vite build`) erfolgreich.

    **Beim manuellen Browser-Test gefunden und behoben** (1 Bug, von den Unit-/E2E-Tests
    nicht erkannt, da diese nur auf die exponierte Logik zugreifen, nicht auf das gerenderte
    Vuetify-Markup): Das Feld-Dropdown im `AppliesToEditor` zeigte den rohen `metadataOptions`-
    Schlüssel (z. B. `executionType`) statt des an anderer Stelle in derselben Komponente
    verwendeten prettifizierten Labels („Execution Type") — `fieldChoices()` lieferte reine
    Strings statt `{title, value}`-Objekten für `v-select`. Behoben durch `item-title`/
    `item-value`-Props und Umbau von `fieldChoices()` auf Objekt-Rückgabe.

**Phase 5 — Komfort — ✅ abgeschlossen (2026-07-17)**
19. ✅ Drag & Drop via `vuedraggable@4.1.0` in `EditorTree.vue` (Kategorien-Reorder,
    Entry-Reorder **und** Verschieben zwischen Kategorien über eine gemeinsame
    `group="editor-tree-entries"`) und `ExamplesEditor.vue` (Beispiel-Reorder). Auf/Ab-Buttons
    **bleiben** zusätzlich bestehen (Tastatur-/Screenreader-Zugänglichkeit, Drag & Drop ist
    naturgemäß mausgebunden) — kein Fallback mehr im ursprünglichen Sinn, sondern bewusst
    dauerhaft gleichrangige zweite Bedienoption (P5). Während der Baum gefiltert ist (Suche
    aktiv), ist Drag & Drop deaktiviert (`:disabled` auf `<draggable>`) statt auf der gefilterten
    statt der echten Liste zu operieren — die gefilterte Liste ist nur bei aktiver Suche eine
    eigene Kopie, sonst dieselbe Referenz wie die echte Kategorien-/Entries-Liste, s. Kommentar
    in `EditorTree.vue`.
20. ✅ Undo/Redo-Stack in `CatalogEditor.vue` — Session-lokal je offenem Editor-Tab (nicht
    persistiert, unabhängig vom Store-Dirty-Flag), Snapshot-basiert (`draft.categories` als
    JSON-Snapshot, kein Command-Pattern) statt pro Aktion einzeln zu instrumentieren, damit
    Baum-Drag&Drop und alle bestehenden Mutationen (Add/Duplicate/Delete/Move) einheitlich
    erfasst werden. Getippte Änderungen werden über 500ms debounced zu einem Schritt
    zusammengefasst. Vergleichsbasiert statt Flag-basiert re-entrant-sicher: ein Snapshot wird
    nur aufgezeichnet, wenn er inhaltlich vom letzten abweicht — dadurch lösen `undo()`/`redo()`
    selbst (sie landen exakt auf dem Snapshot-Inhalt) keinen erneuten Eintrag aus, ganz ohne
    Flag/`nextTick`-Timing-Abhängigkeit (bewusst einfacher als das `flush:'sync'`-Muster beim
    Dirty-Tracking in Phase 3, s. dortiger Kommentar in `workspaceStore.js`). „Duplizieren von
    Kategorien/Entries" (P10) war bereits seit Phase 3 vorhanden (Knotenmenü), hier nur verifiziert.
21. ✅ Tastatur-Flows: Cmd/Ctrl+S speichert, Cmd/Ctrl+Z / +Shift+Z (bzw. +Y) für Undo/Redo —
    beide nur wirksam, wenn der Tab des jeweiligen Katalogs der aktive Workspace-Tab ist (Vuetifys
    `v-window` hält alle offenen Tabs gleichzeitig gemountet, daher ein expliziter Guard gegen
    `store.activeWorkspaceTabId`, sonst würde ein Shortcut versehentlich einen Hintergrund-Tab
    treffen). Z/Shift+Z greifen zusätzlich nicht, während der Fokus in einem Textfeld liegt, damit
    das native Feld-Undo des Browsers beim Tippen nicht überschrieben wird. Enter in der
    Description-Zeile des letzten Beispiels in `ExamplesEditor.vue` legt eine neue Zeile
    desselben Typs an und fokussiert sie.

    24 neue/erweiterte Unit-Tests (`tests/unit/catalogEditor.spec.js` Undo/Redo-Block,
    `tests/unit/catalogSubEditors.spec.js` `keyFor`/`onDescriptionEnter`); Drag & Drop selbst
    (Sortable.js-Mausinteraktion) ist in jsdom nicht sinnvoll unit-testbar — dafür per echtem
    Playwright-Mausdrag im manuellen Browser-Test verifiziert (s. u.). Gesamte Unit-Suite danach
    239/239 grün, `npm run lint`/`format:check` sauber, volle E2E-Suite (9 Szenarien/65 Schritte)
    grün, Produktions-Build erfolgreich.

    **Beim manuellen Browser-Test gefunden und behoben** (1 Bug, von den Unit-Tests nicht
    erkannt, da CSS-Kaskaden-Effekte nur im gerenderten DOM sichtbar sind): Der neue
    Drag-Handle-Icon in `EditorTree.vue` war permanent sichtbar statt nur bei Hover — Vuetifys
    `v-icon` bringt eine eigene Default-Opacity (~0.6, "medium emphasis") mit, die die einfache
    scoped-CSS-Regel `.drag-handle { opacity: 0 }` überstimmte (der baugleiche, bereits aus
    Phase 3 bestehende `.node-menu`-Hover-Trick war davon nicht betroffen, da er auf einem
    `v-btn`-Wrapper sitzt statt direkt auf einem `v-icon`). Behoben mit `!important` auf beiden
    Opacity-Regeln (Basis- und Hover-Zustand), analog zur bereits bestehenden
    `.drag-handle-disabled`-Regel, die dasselbe Problem schon vorwegnahm.

**Neue Abhängigkeit:** `vuedraggable@4.1.0` (Vue-3-Wrapper um Sortable.js), installiert für
Phase 5.

**Phase 6 — Interview-optimierter Katalog als Zusatzkatalog — ✅ abgeschlossen (2026-07-18)**

**Abweichung vom ursprünglichen Plan (auf Nutzerwunsch):** Diese Phase war ursprünglich als
reine inhaltliche *Konsistenzprüfung des bestehenden Standardkatalogs* geplant (Review in
place). Stattdessen wurde die überarbeitete, interviewgerechte Fassung **als zusätzlicher,
eigenständiger Katalog** ausgeliefert — der Standardkatalog bleibt unverändert erhalten.
Beide stehen ab sofort parallel in der Bibliothek. Der ursprüngliche Review-Plan (Schritte
22–24 unten) bleibt als *Design-Rationale* dokumentiert: Er beschreibt die inhaltlichen
Prüf-Kriterien, nach denen der neue Katalog kuratiert wurde.

**Zweck des neuen Katalogs „Software System Interview":** Er strukturiert **Interviews zu
Softwaresystemen**, sodass sich Rückschlüsse auf verwendete **Muster** (→ Referenz­architekturen)
und **Technologien** (→ Toolchains) ziehen lassen (die Ableitung selbst passiert außerhalb von
SolutionInventory). Konkrete Design-Entscheidungen gegenüber dem Standardkatalog:

- **Kuratiert & konsolidiert statt erschöpfend:** ~40 statt ~90 Aspekte, in interview-typische
  Gesprächsreihenfolge gebracht (Kontext → Domäne → Architektur → Stack → Cross-Cutting →
  Delivery → Operations → Hardware). Mehrere Ops-Aspekte des Standardkatalogs (Logging,
  Metrics, Tracing, Log-Aggregation) sind z. B. zu einem Interview-Aspekt „Observability"
  zusammengefasst.
- **Neue Domänen-/Kontext-Kategorie:** „Business & Domain Context" (Business Capability,
  Domain Complexity, Users, Lifecycle, Constraints) — die der Standardkatalog gar nicht hat,
  für ein Interview aber die entscheidende Rahmung liefert.
- **Practice/Tool durchgängig getrennt:** Jeder Aspekt nutzt das typisierte Beispielmodell
  (§3.1a) mit eigenständigen `type: 'practice'`- und `type: 'tool'`-Beispielen. Genau das
  bedient den Zweck: Practices rollen zu Referenzarchitekturen auf, Tools zu Toolchains.
- **Interview-Formulierung:** `entry.description` ist als Interviewer-Leitfrage/-Hinweis
  formuliert („was erfragen / warum relevant"), nicht als neutrale Definition.
- **appliesTo geprüft:** `executionType`/`architecturalRole`-Vokabular identisch zum
  Standardkatalog gehalten, damit die Sichtbarkeitslogik greift (Beispiel manuell verifiziert:
  „Headless Service / API" blendet die Kategorie „Hardware & Edge" korrekt aus). Der
  Fixture-Test verlangt für diesen Katalog **null Fehler und null Warnungen** (jeder
  appliesTo-Wert trifft eine `metadataOptions`-Option).

**Umsetzung/Dateien:**
- `src/services/interviewCatalogData.js` (neu) — die kuratierten Interview-Inhalte in
  Katalog-Form mit typisierten Beispielen; `executionType`/`architecturalRole`-Optionen und
  Metadaten-Feldschema identisch zum Standardkatalog (Letzteres, weil das Ausfüllformular in
  `Questionnaire.vue` fest auf diese Felder liest).
- `catalogService.js` — `buildInterviewCatalog()` + `INTERVIEW_CATALOG_ID = 'catalog-interview'`
  (liefert bei jedem Aufruf einen frischen Deep-Clone).
- `seedWorkspace()` seedet beide eingebauten Kataloge; der erste Fragebogen wird weiterhin aus
  dem Standardkatalog instanziiert (unverändertes Verhalten).
- **Migration auf STORAGE_VERSION 3** (§3.3.2a): `migrateWorkspaceToV3` fügt den Interview-Katalog
  idempotent hinzu (add-if-missing per id). Läuft nur beim Hochmigrieren einer < v3-Workspace,
  sodass ein späteres Löschen durch den Nutzer bestehen bleibt. `SUPPORTED_STORAGE_VERSIONS`
  auf `[1, 2, 3]` erweitert, damit v2-Bestandsdaten **nicht** fälschlich als „unsupported" den
  B1-Fehlerpfad auslösen. Der Ladepfad wendet nun alle fälligen Migrationsschritte
  (`runWorkspaceMigrations`) je nach Ausgangsversion an (v1 → v2+v3, v2 → v3, v3 → keine).

**Verifikation:** 249 Unit-Tests grün (Builder-Validität inkl. „0 Fehler/0 Warnungen",
v2→v3-idempotent, „v3 mit gelöschtem Katalog re-addet nicht", Seed enthält beide Kataloge,
angepasste Golden-Master-Tests), `lint`/`format` sauber, E2E 9/9 (inkl. Export/Import-Rundlauf),
Produktions-Build erfolgreich, manueller Browser-Check (beide Kataloge in Bibliothek, Editor
öffnet, typisierte Practice/Tool-Beispiele, appliesTo-Sichtbarkeit im Fragebogen).

**Nachtrag 2026-07-18 — Ausbau „Hardware, Edge & Industrial Control" (auf Nutzerwunsch):** Die
Kategorie `hardware` (vorher „Hardware & Edge", 2 Aspekte) wurde für Interviews zu
**Maschinensteuerungssoftware, HMIs und SCADA** deutlich erweitert (jetzt 9 Aspekte, in
Interview-Reihenfolge): Automation & Control Role (Purdue/ISA-95-Einordnung), Control Logic
Programming Model (IEC 61131-3/61499, CODESYS/TwinCAT/TIA Portal/…), Device Interface & I/O
Access, Industrial Communication Protocols (PROFINET, EtherCAT, EtherNet/IP, PROFIBUS, Modbus,
OPC UA/Classic, MQTT Sparkplug B, CANopen, IO-Link, S7comm, DNP3, IEC 61850, BACnet), Real-Time
& Timing, Functional Safety & Redundancy (IEC 61508/62061, ISO 13849, Safety-PLCs), HMI &
Visualization Platform (Ignition, WinCC, AVEVA/Wonderware, FactoryTalk View, zenon, …), Process
Data & Historian (PI, Ignition Historian, InfluxDB, …) und Edge & IIoT Cloud Connectivity (Azure
IoT Edge, Greengrass, Kepware, Node-RED, …). `appliesTo` der Kategorie unverändert
(Embedded/IoT, Desktop, Background Worker) — deckt Steuerung (embedded), HMI/SCADA-Client
(desktop) und SCADA-Server (background worker) ab. Katalog weiterhin fehler- **und** warnungsfrei
(Fixture-Test), Browser-Check der erweiterten Kategorie durchgeführt.

**Nachtrag 2026-07-18 — Backend-/Frontend-Interna nachgeschärft (auf Nutzerwunsch):** Rückmeldung
war, dass die erste Fassung (43 Aspekte) gegenüber dem Standardkatalog (94) zu dünn war,
insbesondere bei den Backend-/Frontend-Interna. Der Katalog wurde daher gezielt auf **67 Aspekte**
angereichert — bewusst weiterhin kuratierter als die erschöpfenden 94, aber mit den
architektur-/toolchain-relevanten Interna zurück im Boot. Neu:

- **Neue Kategorie „Backend Design & Internals"** (9 Aspekte, `appliesTo` server-side): Data Access
  & Persistence Mapping (ORM/Micro-ORM/Raw SQL; EF, Hibernate, Prisma, Dapper, …), API Design &
  Documentation (REST/gRPC/GraphQL/AsyncAPI; OpenAPI/Swagger), API Versioning Strategy,
  Dependency Injection, Server-Side Caching (Redis/…), Background Jobs & Scheduling
  (Hangfire/Quartz/Celery/…), Workflow & Process Orchestration (Camunda/Temporal/…),
  Error-Handling Pattern, Schema & Migration Management (EF Migrations/Flyway/Liquibase).
- **Neue Kategorie „Frontend Design & Internals"** (8 Aspekte, `appliesTo` UI-Typen): Client
  Platform & OS, State Management (Redux/Pinia/NgRx/RxJS/…), Component Library & Design System
  (MUI/Vuetify/Telerik/…), Styling & Theming (SCSS/Tailwind/WPF XAML), Client Data & Offline
  (IndexedDB/SQLite/Workbox/…), Frontend Build & Tooling (Vite/Webpack/Nx/…), Accessibility (A11y),
  Internationalization (i18n).
- **Punktuelle Ergänzungen bestehender Kategorien:** Architecture → Multi-Tenancy Model; Technology
  Stack → Data Analytics & Reporting (Power BI/Tableau/Grafana/Snowflake/…); Cross-Cutting → Audit
  & Compliance Logging + Licensing & Usage Enforcement (FlexNet/CodeMeter — relevant für
  kommerzielle/On-Prem-/Maschinensoftware); Quality & Delivery → Test Management & Traceability
  (TestRail/Xray/Azure Test Plans); Operations → Web Server / Reverse Proxy (nginx/IIS/Traefik/…)
  + Artifact & Container Registry (ACR/ECR/Harbor/Artifactory/…).

Bewusst **weggelassen** (geringes Architektur-/Toolchain-Signal): Datums-/Zeit-Repräsentation.
Katalog weiterhin fehler- **und** warnungsfrei (Fixture-Test), Browser-Check der neuen Kategorien
durchgeführt (Backend-Interna gerendert, appliesTo greift). 249 Unit-Tests grün, E2E 9/9, Build
erfolgreich.

**Nachtrag 2026-07-18 — Nachgeforderte Aspekte + Security ergänzt (auf Nutzerwunsch):** Vier
zuvor bewusst weggelassene Aspekte wurden doch aufgenommen, plus eine echte Security-Lücke
geschlossen — jetzt **72 Aspekte**:

- Frontend → **Client-Side Logging** (loglevel/Sentry/console) und **Client Analytics & User
  Tracking** (Google Analytics/Mixpanel/Matomo/Plausible/…).
- Quality & Delivery (ungated, gilt teamweit) → **Development Environment & IDE** (Visual
  Studio/JetBrains/VS Code/…) und **Performance Profiling** (BenchmarkDotNet/dotMemory/Chrome
  DevTools/…) — bewusst ungated statt frontend-/backend-gated, da beide unabhängig vom
  Runtime/Rolle relevant sind.
- Cross-Cutting → **Network Security & Segmentation** (Perimeter/DMZ, Zero-Trust, Zonen/VLANs,
  **OT/IT-Segmentierung nach IEC 62443**, WAF; mTLS/Service Mesh/VPN). Damit ist die einzige
  echte Security-Lücke geschlossen: Die übrigen Security-Themen des alten Standardkatalogs
  (Authentication, Authorization, Secrets & Encryption, Vulnerability-Scanning, Audit-Logging,
  Licensing) sind bereits über „Cross-Cutting Concerns" und „Code Quality & Security Scanning"
  abgedeckt.

Datums-/Zeit-Repräsentation bleibt als einziger bewusst ausgelassener Standardkatalog-Aspekt.
Katalog weiterhin fehler-/warnungsfrei, 249 Unit-Tests grün, E2E 9/9, Build erfolgreich.

---

*Ursprünglicher Review-Plan (bleibt als Design-Rationale für den neuen Katalog gültig):*

22. **Automatisiertes Screening als Ausgangspunkt.**
    `validateCatalog(buildStandardCatalogFromSeed(getCategoriesData()))` liefert bereits
    strukturelle Warnungen (leere Kategorien, `appliesTo` mit unbekannten Feldern/Werten,
    s. §3.2/§6.4).
23. **Inhaltliche Prüfung je Kategorie/Entry (Domänenwissen erforderlich):**
    - *Kategorisierung:* Passt die Zuordnung der Entries zu ihrer Kategorie? Gibt es
      inhaltliche Dopplungen zwischen Kategorien oder fehlende Aspekte?
    - *Practice-/Tool-Beispiele:* Ist ein Practice-Beispiel tatsächlich eine Methodik/ein
      Pattern (nicht versehentlich ein konkretes Produkt) und sind zugehörige Tool-Beispiele
      tatsächlich konkrete Tools? Da beide seit §3.1a unabhängige, gleichrangige Beispiele
      sind, wurde der Interview-Katalog konsequent so aufgebaut.
    - *appliesTo-Sichtbarkeit:* Ergibt die Ein-/Ausblendung von Entries nach `executionType`/
      `architecturalRole` fachlich Sinn? Stichprobenartig für mehrere Applikationstyp-/
      Rollen-Kombinationen durchgespielt (z. B. blendet „Headless Service / API" die
      Hardware-Kategorie korrekt aus).
24. **Befunde über den Katalog-Editor beheben** (steht seit Phase 3/4 zur Verfügung); bei
    strukturellen Änderungen die `version` des jeweiligen Katalogs erhöhen, damit bereits
    instanziierte Fragebögen über `catalogVersion` erkennbar veraltet sind (s. offener
    Punkt 2, §7). *(Der Standardkatalog wurde bewusst nicht angefasst — die Überarbeitung ist
    der neue Zusatzkatalog.)*

**Gate zwischen den Phasen:** Eine Phase gilt erst als abgeschlossen, wenn alle
Kompatibilitätstests (§6.2) und die bestehenden Unit-/E2E-Suiten grün sind.

### 5.6 Akzeptanzkriterien (Auszug)

Inhaltliche Qualität (Phase 6 — als interviewgerechter Zusatzkatalog umgesetzt):

- [x] Ein interviewgerecht kuratierter, konsolidierter Katalog steht **zusätzlich** zum unveränderten Standardkatalog in der Bibliothek und ist für Projekte wählbar. *(Phase 6, 2026-07-18 — `catalog-interview`, „Software System Interview".)*
- [x] Der neue Katalog trennt durchgängig Practice- und Tool-Beispiele (typisiertes Modell §3.1a), sodass Muster→Referenzarchitektur und Technologien→Toolchain getrennt aufrollbar sind. *(Phase 6, 2026-07-18)*
- [x] `appliesTo`-Sichtbarkeit je Applikationstyp/Rolle wurde geprüft und ist fachlich stimmig; der Katalog ist frei von `validateCatalog`-Fehlern **und** -Warnungen (Fixture-Test). *(Phase 6, 2026-07-18)*
- [x] Bestandsworkspaces (v1/v2) erhalten den Zusatzkatalog per idempotenter v3-Migration, ohne dass ein Löschen durch den Nutzer wieder rückgängig gemacht wird. *(Phase 6, 2026-07-18)*

Funktional:

- [x] Mehrere Kataloge lassen sich in der Bibliothek anlegen, umbenennen, duplizieren, löschen; ein referenzierter Katalog kann nicht gelöscht werden. *(Phase 2, 2026-07-17)*
- [x] Beim Anlegen eines Projekts wird ein Default-Katalog gewählt; der erste Fragebogen wird daraus instanziiert und im Projekt gespeichert. *(Phase 2, 2026-07-17)*
- [x] Ein Katalog wird beim Speichern gegen `catalog.schema.json` validiert; Fehler blockieren das Speichern. *(Phase 3, 2026-07-17 — Import-Validierung fehlt noch, da es noch keinen Katalog-Import gibt.)*
- [x] Schließen **und** Verlassen des Editors (Tableiste **und** Seitenbaum) mit ungespeicherten Änderungen zeigt immer den Speichern/Verwerfen-Dialog. *(Phase 3, 2026-07-17)*
- [x] Kein `window.alert` / `window.confirm` mehr im Client-Code. *(Phase 3, 2026-07-17)*
- [x] Umbenennen einer Kategorie/eines Entries ändert dessen ID nicht mehr automatisch; ID-Änderung nur noch über expliziten „New ID"-Button. *(Phase 3, 2026-07-17)*
- [x] `entry.description`, `example.tools`, `appliesTo` und `metadataOptions` sind ohne JSON-Export editierbar. *(Phase 4, 2026-07-17)*
- [x] Ein Tool-Beispiel lässt sich ohne zugehöriges Practice-Beispiel anlegen (unabhängige,
  gleichrangige Beispiele). *(Nachtrag zu Phase 4, §3.1a, 2026-07-17)*
- [ ] Ein Katalog mit 10 Kategorien à 20 Entries ist ohne Volltext-Scrolling navigierbar (Baum + Suche). *(Baum+Suche vorhanden, aber nicht mit dieser Datenmenge stichprobenartig geprüft.)*
- [x] Löschen einer Kategorie ist 5 Sekunden per Undo rücknehmbar. *(Phase 3, 2026-07-17 — auch für Entries.)*
- [x] Kategorien und Entries lassen sich per Drag & Drop umsortieren, Entries auch zwischen
  Kategorien verschieben; Auf/Ab-Buttons bleiben als zweite Bedienoption verfügbar.
  *(Phase 5, 2026-07-17)*
- [x] Strukturänderungen im Editor (inkl. Drag & Drop) lassen sich schrittweise per Undo/Redo
  zurücknehmen/wiederholen, unabhängig vom „Alle Änderungen verwerfen"-Reset.
  *(Phase 5, 2026-07-17)*
- [x] Cmd/Ctrl+S speichert den aktiven Katalog-Tab; Cmd/Ctrl+Z/+Shift+Z steppt durch die
  Undo/Redo-Historie, ohne das native Text-Undo in Eingabefeldern zu stören.
  *(Phase 5, 2026-07-17)*

Abwärtskompatibilität (verbindlich, Nachweis über §6.2):

- [x] Ein v1-Workspace (localStorage **und** Electron-Datei) lädt nach dem Umbau verlustfrei: alle Projekte, Fragebögen, Antworten, Kommentare, Applicability-Werte, Radar-Daten, ausgeblendete Entries und offenen Tabs sind unverändert vorhanden. *(Phase 0/1 — `storageCompat.spec.js` „loads every stored field without data loss" auf `v1-workspace-full.json`. Electron- und Web-Ladepfad laufen beide über dieselbe `applyStoredData()`, nur die I/O-Schicht unterscheidet sich — die dediziert electron-spezifischen Tests decken deren Fehlerfälle ab, s. B1-Block unten. Bereinigt 2026-07-17, war zuvor unmarkiert trotz bestehender Testabdeckung.)*
- [x] Die Migration ist idempotent: zweimaliges Laden/Migrieren erzeugt denselben Zustand. *(Phase 0/1 — `storageCompat.spec.js` „is idempotent" für `v1-workspace-full.json` und die v1→v2-Katalogmigration. Bereinigt 2026-07-17.)*
- [ ] Vor der ersten Persistierung im neuen Format existiert ein Backup des Alt-Stands. *(Nicht implementiert — kein Backup-Mechanismus in `persistence.js`/`workspaceStore.js`. Echte Lücke, nicht nur unmarkiert.)*
- [x] Ein Datensatz mit *neuerer* Version oder Parse-Fehler wird **nie** durch einen Seed ersetzt oder überschrieben; die UI zeigt einen Fehlerzustand, Autosave bleibt aus. *(Phase 0 — B1-Fix, `storageCompat.spec.js` Block „B1 fix", je vier Tests für Web und Electron. Bereinigt 2026-07-17.)*
- [x] Projekt-/Fragebogen-Exporte aus v1.11 (u. a. `tests/data/golden_sample_project.json`) lassen sich unverändert importieren; Fragebögen ohne `catalogId` funktionieren vollständig (Ausfüllen, Radar, Matrix, Vergleich, Export). *(E2E `export-import.feature`, 2/2 Szenarien grün — Import bleibt exaktes Byte-Match, s. §3.1a zur bewussten Entscheidung, dafür keine Beispiel-Migration beim Import laufen zu lassen. `catalogId`/`catalogVersion` sind optionale Felder, die Radar-/Matrix-/Export-Logik liest sie nirgends. Bereinigt 2026-07-17.)*
- [x] Das Projekt-Exportformat behält seine Grundstruktur; neue Felder sind additiv. *(Per Konstruktion — s. „Kompatibilitätsregel" oben; abgesichert durch den persist()-Round-Trip-Test in `storageCompat.spec.js`. Bereinigt 2026-07-17.)*

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
