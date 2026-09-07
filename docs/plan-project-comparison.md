# Umsetzungsplan: Projektvergleich und gemeinsames Vokabular

> **Grundlage:** [design-project-comparison.md](./design-project-comparison.md). Dieses Dokument plant *wie* umgesetzt wird, nicht *was* — inhaltliche Fragen werden im Design-Dokument entschieden, nicht hier.
>
> **Zweck:** Arbeitsgrundlage für eine KI-gestützte Umsetzung. Jeder Teilschritt ist so geschnitten, dass er einzeln umgesetzt, einzeln getestet und einzeln zurückgenommen werden kann.

---

## 1. Arbeitsregeln

Diese Regeln gelten für **jeden** Teilschritt. Sie sind der eigentliche Qualitätsmechanismus — ohne sie wird aus einem Plan eine Wunschliste.

- [ ] **Ein Todo = ein Commit.** Kein Sammel-Commit über mehrere Todos. Der Commit-Text nennt die Todo-Nummer.
- [ ] **Vor und nach jedem Todo `npm run test:unit`.** Startwert ist die Baseline aus Phase 0. Die Zahl der grünen Tests darf nie sinken.
- [ ] **`npm run lint` und `npm run format:check` müssen grün sein**, bevor ein Todo als erledigt gilt.
- [ ] **Golden-Fixtures unter `Client/tests/data/storage/` werden nie bearbeitet.** Sie sind eingefrorene Verträge (siehe Kopfkommentar in `storageCompat.spec.js`). Neue Versionen kommen *daneben*, nie *statt*.
- [ ] **`STORAGE_VERSION` wird nicht erhöht.** Begründung in [design §7.1](./design-project-comparison.md). Wer meint, es doch zu brauchen, hält an und fragt nach. Das gilt auch für das neue Save-Daten-Feld des Comparison-Tabs (Todo 4.2): Ältere Builds ignorieren es, ein Bump wäre die teurere Antwort.
- [ ] **Ein bestehender Test wird nur geändert, wenn sich das Verhalten bewusst ändert.** Dann gehört die Begründung in den Commit-Text. Ein Test, der „plötzlich nicht mehr passt", ist ein Fund, keine Aufgabe.
- [ ] **Keine neuen Laufzeit-Abhängigkeiten** ohne Rückfrage. Levenshtein und Normalisierung werden selbst implementiert (siehe Todo 1.6).
- [ ] **Nach jeder Phase die E2E-Suite** `npm run test:e2e`. Sie ist langsam, deshalb nicht pro Todo.

### Wenn etwas nicht passt

Widerspricht der Code dem Design-Dokument, ist **das Design-Dokument zu korrigieren, nicht der Code stillschweigend anzupassen.** Der Widerspruch wird gemeldet, nicht überbrückt. Das Design-Dokument hat vier Überarbeitungsrunden hinter sich; ein neuer Widerspruch ist ein echter Fund.

---

## 2. Ausgangslage

Stand geprüft am 2026-08-26 gegen den Code, nicht gegen Annahmen. **Am 2026-09-07 erneut nachgemessen und unverändert gültig:** 285 Unit-Tests in 15 Dateien grün (1,07 s), `STORAGE_VERSION = 3`.

| Punkt | Befund |
|---|---|
| Unit-Tests | 285 Tests in 15 Dateien, alle grün, Laufzeit ~1,2 s (`vitest`) |
| Komponententests | `@vue/test-utils` + Pinia über `tests/unit/helpers/mountWithStore.js`; Vuetify wird bewusst *nicht* installiert, getestet wird `wrapper.vm`, nicht Markup |
| E2E | Cucumber + Playwright gegen den Dev-Server, Features unter `tests/features/` |
| Rückwärtskompatibilität | `storageCompat.spec.js` mit eingefrorenen Fixtures unter `tests/data/storage/` |
| Speicherformat | `STORAGE_VERSION = 3`, `SUPPORTED_STORAGE_VERSIONS = [1,2,3]`; `applyStoredData` übernimmt den Workspace als Ganzes, unbekannte Felder überleben |
| Ungated Migration | `migrateProjectRadar` läuft versionsunabhängig auf jedem Load — Präzedenzfall für die Vokabular-Normalisierung |
| Lint/Format | ESLint 9 + Prettier, beide als npm-Skripte verfügbar |

### 2.1 Vorhandene Vorarbeit im MCP-Server

Der .NET-MCP-Server löst ein verwandtes Problem bereits und ist **kalibriert**. `MCP/McpServer/Logic/DataConsistencyAnalyzer.cs` erkennt Near-Duplicates in Technologienamen mit diesen Schwellen:

```csharp
private const int MinNearDuplicateLength = 5;   // Distanz 1 erst ab 5 Zeichen
private const int Distance2MinLength     = 8;   // Distanz 2 erst ab 8 Zeichen

bool isNearDuplicate = (distance == 1)
                    || (distance == 2 && minLen >= Distance2MinLength);
```

Die häufigere Schreibweise gilt dort als kanonische Form. **Diese Schwellen werden übernommen, nicht neu erfunden** (Todo 1.6) — gleiches Produkt, gleiches Problem, bereits gegen Fehlalarme austariert.

**Wichtige Einschränkung, die daraus folgt:** Das Leitbeispiel des Designs — `".net core"` gegen `"dotnet core"` — hat eine Levenshtein-Distanz von **3** und wird von dieser Heuristik **nicht** gefunden. Der in [design §3.2](./design-project-comparison.md) genannte Token-Überlappungs-Anteil ist also kein Beiwerk, sondern der Teil, der den Hauptanwendungsfall überhaupt abdeckt. Todo 1.6 muss beides liefern und gegen genau dieses Paar testen.

### 2.2 Verweise ins Leere

**19 Kommentare in `Client/src` und `Client/tests` verweisen samt Paragraphennummern auf `docs/spec-fragenkataloge.md` — eine Datei, die es im Repository nicht gibt.** Betroffen sind unter anderem `workspaceStore.js`, `migrations.js`, `persistence.js`, `catalogService.js`, `catalogValidation.js`, `catalog.schema.json` und `storageCompat.spec.js`.

Das ist kein Schönheitsfehler: Es sind genau die Dateien, die dieses Vorhaben anfasst. Eine KI, die einem solchen Verweis folgt, findet nichts und rät im Zweifel — bei Migrationsstrategie und Speicherformat also dort, wo Raten am teuersten ist. Wird in Phase 0 bereinigt, bevor irgendetwas anderes beginnt.

---

## 3. Test- und Qualitätsstrategie

### 3.1 Welche Teststufe wofür

| Stufe | Werkzeug | Zuständig für | Wann |
|---|---|---|---|
| **Rein funktional** | `vitest`, keine Mounts | `normalize`, `resolve`, Alias-Index, Ähnlichkeit, Coverage-Einstufung, Δ-Berechnung, Kennzahlen | Bei jedem Todo der Phasen 1 und 3 |
| **Store** | `vitest` + Pinia | Vokabular-Mutationen, Persistenz, Normalisierung beim Laden | Phase 1 |
| **Komponente** | `mountWithStore` | Filterlogik, Zustandsübergänge, exponierte Berechnungen über `wrapper.vm` | Phasen 2, 4, 5 |
| **Golden Master** | `storageCompat.spec.js` | Dass Bestandsdaten unverändert laden | Phase 0 und 7 |
| **E2E** | Cucumber + Playwright | Durchstich über die drei Workflow-Phasen | Ende jeder Phase, ausführlich in Phase 7 |

### 3.2 Definition of Done je Todo

Ein Todo gilt als erledigt, wenn **alle fünf** Punkte zutreffen:

1. Die beschriebene Änderung ist umgesetzt.
2. Neue Tests decken den Normalfall **und** mindestens einen Grenzfall ab (leer, `null`, Duplikat, Kollision).
3. `npm run test:unit` ist grün und die Testzahl ist **gestiegen** — Ausnahme sind reine Kommentar- oder Messtodos wie 0.1 und 0.2, bei denen sie gleich bleibt.
4. `npm run lint` und `npm run format:check` sind grün.
5. Kein bestehender Test wurde geändert — oder die Änderung ist im Commit begründet.

### 3.3 Grenzfälle, die in jeder Phase mitgetestet werden

Diese Fälle haben das Design geprägt und sind erfahrungsgemäß die, die brechen:

- Leerer Workspace, Workspace mit einem Projekt, Projekt ohne Radar-Blips
- Blip mit leerem `entry.status`, dessen Antwort einen Status trägt → **nicht** `⊘ unset`, sondern der geerbte Status ([design DE-7](./design-project-comparison.md))
- Blip, bei dem **beide** Statusquellen leer sind → `⊘ unset`
- Derselbe Begriff mehrfach in einem Projekt unter verschiedenen Entries ([DE-3](./design-project-comparison.md))
- Begriff, auf den **mehrere** Δ-Bedingungen gleichzeitig zutreffen (z. B. `⚠` in Projekt A, `⊘` in Projekt B) → genau ein Badge nach der Rangfolge in [design §5.3](./design-project-comparison.md)
- `◑ unique`-Begriff, der intern uneinheitlich ist → zählt **nicht** in `Excluded` ([DE-8](./design-project-comparison.md))
- Bezeichnung ohne Vokabular-Treffer und ohne `answerType` → `⬚ unassigned`
- Alias, der bereits einem anderen Begriff gehört → Kollision muss **scheitern**, nicht stillschweigend überschreiben
- Blip, dessen Entry oder Antwort zwischenzeitlich gelöscht wurde (Rückjoin läuft ins Leere)
- Projekte mit **unterschiedlichen** Katalogen — der Hauptgrund für die Begriffszentrierung

### 3.4 Stabilität über die Phasen hinweg

- **Die Baseline aus Phase 0 ist die Messlatte.** Sinkt die Zahl grüner Tests, wird angehalten.
- **Jede Phase endet lauffähig.** Kein „das wird in der nächsten Phase repariert".
- **Phase 2 ist eine natürliche Auslieferungsgrenze:** Vokabularpflege im Radar hat für sich genommen Nutzen, auch wenn der Vergleich noch nicht existiert.
- **Headless vor UI.** Die Phasen 1 und 3 liefern reine Logikmodule mit hoher Testdichte; die UI-Phasen bauen nur noch darauf auf. Das hält den schwer testbaren Anteil klein.

---

## 4. Phasenplan

### Phase 0 — Sicherheitsnetz

**Ziel:** Bekannter, dokumentierter Ausgangszustand. Kein Produktivcode.

- [ ] **0.1 Baseline festhalten**
  - `npm run test:unit`, `npm run lint`, `npm run format:check`, `npm run test:e2e` ausführen
  - Ergebnis (Testzahl, Laufzeit, Warnungen) als Kommentar in dieses Dokument unter §6 eintragen
  - Erwartung laut §2: 285 Unit-Tests grün
- [ ] **0.2 Verweise ins Leere bereinigen** *(vor allen Code-Änderungen)*
  - Fundstellen: `grep -rn 'spec-fragenkataloge' Client/src Client/tests` — 19 Treffer
  - Jeden Verweis auf eine Quelle umbiegen, die es tatsächlich gibt; in den meisten Fällen liegt sie direkt daneben:
    - Katalogstruktur, Beispiel-Typen und Validierungsregeln → `Client/src/schema/catalog.schema.json` und `catalogValidation.js`
    - Migrationsstrategie und Speicherformat → Kopfkommentar in `Client/src/stores/migrations.js`
    - Golden-Master-Vertrag → Kopfkommentar in `Client/tests/unit/storageCompat.spec.js`
  - Findet sich kein Ersatz, wird der Verweis **entfernt** statt umgebogen. Ein Kommentar ohne Zeiger ist besser als einer, der ins Leere führt
  - Reine Kommentaränderung: Die Testzahl bleibt hier gleich — die eine erwartete Ausnahme von Punkt 3 der Definition of Done
- [ ] **0.3 Charakterisierungstest für Statusableitung und Hold-Fallback**
  - Zwei getrennte Verhalten festhalten, weil in Phase 5 nur **eines** davon geändert wird:
    1. `effectiveStatus = entry.status || answer.status` — ein Blip ohne kuratierten Status erbt den der Antwort. **Bleibt unverändert.**
    2. `statusToRing` bildet leere und unbekannte Status auf Ring 3 (Hold) ab. **Ändert sich in Todo 5.2.**
  - Ohne diese Trennung wird in Phase 5 versehentlich die Vererbung mit abgeräumt ([design §4.3](./design-project-comparison.md))
  - Datei: `Client/tests/unit/techRadar.spec.js`
- [ ] **0.4 Golden-Fixture für einen v3-Workspace mit Radar-Daten**
  - Unter `Client/tests/data/storage/v3-workspace-radar.json`, ohne `vocabulary`-Feld
  - Beweist ab Todo 1.2, dass die additive Normalisierung Bestandsdaten nicht verändert
  - Bestehende Fixtures dabei nicht anfassen

---

### Phase 1 — Vokabular-Kern (ohne UI)

**Ziel:** Vollständig getestete Auflösungsschicht. Nichts davon ist sichtbar.
**Abhängig von:** Phase 0

- [ ] **1.1 Modul `Client/src/services/vocabulary.js` anlegen**
  - `normalize(s)` = `trim().toLowerCase()`, Mehrfach-Leerzeichen auf eines
  - Reine Funktionen, kein Pinia-, kein Vue-Import — analog zu `workspaceFactories.js`
  - Test: `Client/tests/unit/vocabulary.spec.js`
- [ ] **1.2 Die drei neuen Workspace-Felder additiv normalisieren**
  - In `applyStoredData` neben `migrateProjectRadar`, alle drei in einem Durchgang ([design §7.1](./design-project-comparison.md)):
    - `workspace.vocabulary` → `[]`
    - `workspace.comparisonOverrides` → `{}` (wird in Todo 3.8 befüllt)
    - `workspace.dismissedSuggestions` → `[]` (wird in Todo 4.4 befüllt)
  - Alle drei jetzt anlegen, auch wenn zwei davon erst später benutzt werden — sonst braucht jede spätere Phase ihre eigene Normalisierung und die Golden-Master-Prüfung wird dreimal geführt
  - **Ohne** `STORAGE_VERSION`-Bump, **ohne** Eintrag in `runWorkspaceMigrations`
  - Test: Fixture aus 0.4 lädt, bekommt die drei leeren Felder, alle anderen Felder sind unverändert
- [ ] **1.3 Alias-Index und `resolve()`**
  - Index einmal pro Aufruf aufbauen: `normalize(name)` und alle `aliases` zeigen auf `term.id`
  - `resolve(rawName)` liefert den Begriff oder `null`
  - Grenzfälle: leerer String, nur Leerzeichen, Groß-/Kleinschreibung, doppelte Leerzeichen
- [ ] **1.4 Invariante „ein Alias gehört zu höchstens einem Begriff"**
  - Beim Aufbau des Index wird eine Kollision erkannt und **gemeldet**, nicht überschrieben
  - Test: zwei Begriffe mit demselben Alias → definierter Fehler
- [ ] **1.5 Vokabular-Mutationen im Store**
  - `createTerm(name, kind)`, `addAlias(termId, rawName)`, `renameTerm(termId, name)`, `setTermKind(termId, kind)`, `mergeTerms(sourceId, targetId)`, `deleteTerm(termId)`
  - `mergeTerms` überträgt Aliase und Rohnamen, löscht die Quelle, bricht bei Alias-Konflikt mit einem dritten Begriff ab
  - `id` bleibt beim Umbenennen stabil ([DE-5](./design-project-comparison.md))
  - Test: `Client/tests/unit/workspaceStore.spec.js` erweitern
- [ ] **1.6 Ähnlichkeitssuche**
  - Levenshtein selbst implementieren, Schwellen aus §2.1 übernehmen (Distanz 1 ab 5 Zeichen, Distanz 2 ab 8)
  - **Zusätzlich** Token-Überlappung, damit `".net core"` ↔ `"dotnet core"` (Distanz 3) gefunden wird
  - Nur Vorschläge, nie automatische Zuordnung ([design §3.2](./design-project-comparison.md))
  - Test: das genannte Paar **muss** treffen; ein Gegenpaar wie `"Redis"` / `"Redux"` **darf nicht** treffen

**Phasenabschluss:** `vocabulary.spec.js` deckt Normalisierung, Auflösung, Kollision und Ähnlichkeit ab. Für den Nutzer hat sich nichts geändert — bewusst.

---

### Phase 2 — Vokabular im Alltag

**Ziel:** Begriffe entstehen dort, wo über sie gesprochen wird. Erste sichtbare Wirkung, eigenständig auslieferbar.
**Abhängig von:** Phase 1

- [ ] **2.1 Art eines Blips bestimmen**
  - Reihenfolge nach [DE-11](./design-project-comparison.md): `term.kind` → `answerType` → `unassigned`
  - **Der Rückjoin existiert bereits.** `TechRadar.vue` verbindet Blip und Antwort über `entryId` plus kleingeschriebenen Namensvergleich (`option` ↔ `technology`) und legt `answerType` samt `effectiveStatus` auf das Blip-Viewmodel. Diese Ableitung wird in eine wiederverwendbare Funktion gezogen, **nicht** ein zweites Mal geschrieben ([design §4.3](./design-project-comparison.md))
  - Schreibweise beachten: `answerType` liefert `'Tool'` / `'Practice'`, `kind` ist `'tool'` / `'practice'` — die Abbildung ist ein `toLowerCase()`, jeder andere Wert ergibt `unassigned`
  - Test: alle drei Zweige, plus der Fall „Entry zwischenzeitlich gelöscht" → `unassigned`
- [ ] **2.2 Begriffszuordnung im Blip-Detail**
  - `TechRadar.vue`, vorhandener `detailDialog` / `detailBlip`
  - Zeigt den aufgelösten Begriff oder `◌ nicht im Vokabular`, dazu Ähnlichkeitsvorschlag
  - Aktionen „Zuordnen" und „Als eigenen Begriff anlegen" ([design §3.4](./design-project-comparison.md))
  - „Als eigenen Begriff" belegt `kind` aus `answerType` vor; fehlt der, bleibt die Aktion deaktiviert, bis eine Art gewählt ist — `kind` ist Pflicht und darf nicht geraten werden ([design §5.1](./design-project-comparison.md))
  - Test: über `wrapper.vm`, nicht über Markup
- [ ] **2.3 Vokabular in die Antwort-Vorschläge**
  - `getSuggestions(entry, answerType)` in `Questionnaire.vue` mischt Vokabularbegriffe passender Art dazu
  - Bei leerem `answerType` beide Arten zeigen — heutiges Verhalten beibehalten
  - Katalog-Beispiele, die bereits Alias sind, **unterdrücken** ([design §3.3](./design-project-comparison.md))
  - Test: `Client/tests/unit/questionnaire.spec.js` erweitern
- [ ] **2.4 E2E: Begriff anlegen und wiederfinden**
  - Feature: Begriff im Radar anlegen, in einem zweiten Projekt als Vorschlag antreffen
  - Datei: `Client/tests/features/`

**Phasenabschluss:** Vokabularpflege funktioniert vollständig ohne Vergleichsansicht. Auslieferbar.

---

### Phase 3 — Vergleichs-Engine (ohne UI)

**Ziel:** Alle Kennzahlen als reine Funktionen. Der Teil, der stimmen muss.
**Abhängig von:** Phase 1

- [ ] **3.1 Modul `Client/src/services/comparison.js` anlegen**
  - Eingang: Workspace, Projekt-IDs, Datenquelle, Art-Filter. Ausgang: Datenstruktur für die Ansicht
  - Keine Vue-Abhängigkeit
- [ ] **3.2 Vergleichseinheiten je Datenquelle**
  - Zwei Adapter auf **eine** gemeinsame Form `(rohname, status, art, herkunft)` ([design §4.3](./design-project-comparison.md)):

    ```
    Modus     Einheit                        Schlüssel                              Rohname       Status
    radar     Blip aus project.radar[]       (entryId, option)                      option        effectiveStatus
    answers   Antwort aus den Fragebögen     (questionnaireId, entryId, technology) technology    answer.status
    ```

  - Alles ab Todo 3.3 kennt **nur** diese Form und nie wieder `radar[]` oder `answers[]` — sonst wandert die Modus-Unterscheidung durch die ganze Engine
  - Kategorie im `answers`-Modus: die natürliche Entry-Kategorie aus dem Katalog, dieselbe Quelle, die `TechRadar.vue` heute als Fallback nutzt
  - Test: derselbe Workspace in beiden Modi; der `answers`-Modus liefert **mehr** Begriffe; [DE-3](./design-project-comparison.md) greift dort auch über zwei Fragebögen hinweg
- [ ] **3.3 Vergleichseinheiten zu Begriffszeilen verdichten**
  - Auflösung über Phase 1, Rückfall auf normalisierten Rohtext ([DE-2](./design-project-comparison.md))
  - Entry- und Rohtext-Herkunft je Projektzelle erhalten
- [ ] **3.4 Coverage einstufen**
  - `◉ all` / `◐ partial` / `◑ unique` ([DE-6](./design-project-comparison.md))
  - Test mit 2 und mit 3 Projekten
- [ ] **3.5 Δ Status berechnen**
  - Distanz 0/1/2/≥3, Maximum über alle Paarungen ([design §6.1](./design-project-comparison.md))
  - `⊘ unset` gilt nur bei leerem **`effectiveStatus`**, also wenn weder Blip noch Antwort einen Status tragen ([DE-7](./design-project-comparison.md)) — der häufige Fall „nur `entry.status` leer" ist ein *bewerteter* Blip
  - **Rangfolge implementieren**, nicht nur die Zustände: `—` → `⚠` → `⊘` → `✎` → Distanz. Genau ein Badge je Zeile ([design §5.3](./design-project-comparison.md))
  - Ein ausgeschlossener Zustand nimmt den Begriff **ganz** aus der Distanzberechnung; es wird nicht das betroffene Projekt weggelassen und aus dem Rest eine Distanz gebildet ([design §6.1](./design-project-comparison.md))
  - Test: die Beispielzeilen aus [design §5.3](./design-project-comparison.md) müssen exakt reproduziert werden, plus je ein Fall pro Rangfolgen-Konflikt
- [ ] **3.6 Kennzahlen**
  - `Compared`, `Excluded`, `Comparable`, Verteilung, Agreement, Anteil `◉ all`, Vokabular-Abdeckung
  - **Drei Invarianten als Test** ([DE-8](./design-project-comparison.md)):
    1. `Matches + Minor + Significant + Critical === Comparable`
    2. `Excluded` zählt **nur** innerhalb von `Compared` — nie einen `◑ unique`-Begriff
    3. Kein Begriff in zwei Ausschlussgründen; `⊘ + ⚠ + ✎ === Excluded` gilt exakt, nicht nur ungefähr
  - Vokabular-Abdeckung ignoriert den Art-Filter, **folgt aber der Datenquelle** ([design §5.1](./design-project-comparison.md))
  - Die Kennzahl heißt `Agreement`, nicht „Radar Agreement" — sie gilt auch im `answers`-Modus, wo es kein Radar gibt
- [ ] **3.7 Den Beispieldatensatz des Designs als Fixture**
  - 38 Begriffe, 24/8/6, Anteil `◉ all` 63 %, Compared 32, Excluded 5 (⊘2 ⚠1 ✎2), Comparable 27, Verteilung 20/4/2/1, Agreement 74 % *moderate*, Abdeckung 82 % bei 13 unaufgelösten
  - Ein Test, der genau diese Zahlen prüft — hält Design und Code beieinander
- [ ] **3.8 Criticality-Overrides**
  - Neues Feld `workspace.comparisonOverrides`, **geschlüsselt über `term.id`**, mit `contextProjects` und `contextStatuses`
  - Liegt bewusst *innerhalb* `workspace`, damit die Passthrough-Argumentation aus [design §7.1](./design-project-comparison.md) greift — nicht auf Save-Daten-Ebene
  - **Nicht** zu verwechseln mit dem bestehenden `setRadarOverride` ([design §7](./design-project-comparison.md))
  - Setzbar nur auf Begriffen, die aufgelöst **und vergleichbar** sind — nicht auf `◌`, `◑ unique`, `⚠` oder `⊘` ([DE-5](./design-project-comparison.md))
  - Kippt eine Zeile nachträglich in einen dieser Zustände, bleibt der Override gespeichert, wird aber vom Badge überstimmt und als überprüfungsbedürftig gemeldet
  - „Kontext geändert" wird erkannt

**Phasenabschluss:** Die Engine liefert für den Fixture-Workspace exakt die Zahlen aus dem Design-Dokument — in **beiden** Datenquellen-Modi lauffähig.

---

### Phase 4 — Vergleichsansicht

**Ziel:** Der Comparison-Tab.
**Abhängig von:** Phase 3

- [ ] **4.1 Workspace-Node in der TreeNav**
  - Ersetzt die Überschrift „Projects", deaktiviert bei weniger als zwei Projekten
  - Test: `Client/tests/unit/treeNav.spec.js` erweitern
- [ ] **4.2 Tab-Typ `workspace-comparison`**
  - In `Workspace.vue` analog zu `project-summary`
  - Dazu ein eigenes Persistenzfeld für den Offen-Zustand neben `openQuestionnaireIds` / `openProjectSummaryIds`. Das liegt auf **Save-Daten-Ebene**, nicht in `workspace`, und wird deshalb von `applyStoredData` nicht durchgereicht — ältere Builds verlieren höchstens den Offen-Zustand eines Tabs, den sie ohnehin nicht darstellen ([design §7.1](./design-project-comparison.md))
- [ ] **4.3 Projektauswahl, Art-Filter und Datenquelle**
  - Alle Projekte vorausgewählt, alle drei Arten aktiv; Hinweis bei unter zwei Projekten
  - Dropdown `Data source: [Radar ▾]` schaltet auf den Adapter aus Todo 3.2 um; Standard ist `Radar`
  - Banner nach [DE-4](./design-project-comparison.md), wenn ein selektiertes Projekt in der aktiven Auswahl keine Einträge hat — mit den Aktionen „Alle Fragebogen-Antworten einbeziehen" und „Projekt abwählen". Der Vergleich bleibt von sich aus im Radar-Modus
  - Test: Umschalten ändert Kennzahlen **und** Vokabular-Abdeckung, nicht nur die Zeilenzahl
- [ ] **4.4 Vocabulary-Sektion**
  - Abdeckung je Projekt, Vorschlagsliste, Aktionen Zuordnen / Eigener Begriff / Später / Zusammenführen
  - „Alle exakten Treffer" als Sammelaktion — sie ändert das Vergleichsergebnis **nicht**, nur die Abdeckung ([design §5.1](./design-project-comparison.md)); ein Test hält das fest
  - „Eigener Begriff" ohne `answerType` bleibt deaktiviert, bis eine Art gewählt ist
  - Verworfene Vorschläge landen als Namenspaar in `workspace.dismissedSuggestions[]` und werden nicht erneut angeboten — persistent, nicht nur für die Sitzung ([design §5.1](./design-project-comparison.md))
- [ ] **4.5 Summary Card**
  - Rendert ausschließlich aus 3.6, rechnet nichts selbst
- [ ] **4.6 Comparison Matrix**
  - Zeilen, Coverage- und Δ-Spalte, Sortierung, Filter, Suche
  - `◌`-Markierung sowie `⁉` bei `◌` + `◑ unique`. **Nicht `⚠`** — das steht in derselben Spalte bereits für `inconsistent` ([design §5.3](./design-project-comparison.md))
  - Dasselbe `⁉` trägt die aufgelöste Gegenseite eines möglichen Scheinunterschieds ([DE-6](./design-project-comparison.md)) — sonst sieht die Hälfte des Problems sauber aus
  - Δ-Filter greifen auf das **sichtbare** Badge, also auf das nach Rangfolge gewonnene
  - Klick auf eine Projektzelle springt in das Radar des jeweiligen Projekts
  - Statuschips übernehmen die Farben des bestehenden Radars, die Δ-Badges bekommen eine **eigene Palette** — sonst sind `Retire` (roter Chip) und `critical` (rotes Badge) in derselben Zeile nicht auseinanderzuhalten ([design §5.3](./design-project-comparison.md))

- [ ] **4.7 Criticality-Override bedienbar machen**
  - Deckt [User Story 11](./design-project-comparison.md) ab, für die es bislang nur die Engine-Seite aus Todo 3.8 gab
  - Aktion an der Δ-Zelle: „Als akzeptiert markieren" oder „Auf Critical hochstufen", jeweils mit Kommentarfeld ([design §6.2](./design-project-comparison.md))
  - Auf einer `◌`-Zeile bietet die UI **zuerst die Zuordnung an**, statt den Override zu setzen; auf `◑ unique`, `⚠` und `⊘` ist die Aktion nicht verfügbar ([DE-5](./design-project-comparison.md))
  - Geänderter Kontext wird als „manually set — Kontext hat sich geändert" ausgewiesen, der Override bleibt wirksam
  - Rendert und schreibt ausschließlich über 3.8, rechnet nichts selbst

---

### Phase 5 — Radar

**Ziel:** Art-Filter und Overlay. Enthält die einzige Änderung an bestehendem Verhalten.
**Abhängig von:** Phasen 2 und 3 — **Todo 5.3 zusätzlich von 4.2/4.3**, weil das Overlay im Comparison-Tab lebt. 5.1 und 5.2 sind davon unabhängig und können parallel zu Phase 4 laufen.

- [ ] **5.1 `visibleKinds`-Filter im Radar**
  - Analog zum vorhandenen `visibleStatuses`, drei Chips
- [ ] **5.2 Blips ohne Status nicht mehr auf den Hold-Ring**
  - Betrifft **nur** Blips mit leerem `effectiveStatus`, bei denen also auch die Antwort keinen Status trägt. Die Vererbung `entry.status || answer.status` bleibt unangetastet — Verhalten 1 aus Todo 0.3 muss grün bleiben
  - Stattdessen Liste unterhalb des Diagramms ([design §5.4](./design-project-comparison.md))
  - **Der Charakterisierungstest aus 0.3 wird hier bewusst umgeschrieben** — mit Begründung im Commit
  - Einziger Punkt des Vorhabens, an dem sich bestehende Darstellungen ändern
- [ ] **5.3 Radar Overlay im Vergleich**
  - Referenzprojekt-Auswahl, Symbol und Farbe je Projekt, Konfliktlinien ab Distanz 2
  - Darstellung der vier Sonderfälle laut [design §5.4](./design-project-comparison.md)

---

### Phase 6 — Export

**Abhängig von:** Phase 4

- [ ] **6.1 JSON-Export** — Art-Auswahl, Projektauswahl, Datenquelle, Kennzahlen, Begriffstabelle, Overrides
- [ ] **6.2 Standalone-HTML-Export** — Muster: `utils/techRadarExport.js`
  - Dazu die einzige Änderung an einem **bestehenden** Export: Der Radar-HTML-Export bekommt die aktive Art-Auswahl in den Kopf ([design §7](./design-project-comparison.md)). `techRadarExport.spec.js` hält das heutige Format fest — die Erweiterung ist additiv, der Test darf nicht umgeschrieben werden müssen
- [ ] **6.3 Unaufgelöste Bezeichnungen im Export kennzeichnen**
  - Ein weitergereichter Report muss seine eigene Unsicherheit mitführen

---

### Phase 7 — Härtung und Abnahme

- [ ] **7.1 Golden-Master erneut prüfen** — alle Fixtures laden unverändert, auch die aus 0.4
- [ ] **7.2 Rückwärtskompatibilität praktisch belegen**
  - Workspace mit Vokabular speichern, mit einem Build ohne das Feature laden, erneut speichern
  - Erwartung: `vocabulary` überlebt, weil `applyStoredData` den Workspace als Ganzes übernimmt
- [ ] **7.3 E2E über alle drei Workflow-Phasen**
  - Kataloge ausfüllen → Radar kuratieren und Begriffe zuordnen → vergleichen und exportieren
- [ ] **7.4 Grenzfallliste aus §3.3 vollständig abgehakt**
- [ ] **7.5 Design-Dokument gegen die Umsetzung abgleichen**
  - Abweichungen entweder im Code beheben oder im Design-Dokument nachziehen
  - Insbesondere: stimmen die Beispielzahlen aus §5.2 noch?
- [ ] **7.6 Abschlussmessung** — Testzahl, Laufzeit, Lint; Ergebnis unter §6 eintragen

---

## 5. Abhängigkeiten

```
Phase 0  Sicherheitsnetz
   │
Phase 1  Vokabular-Kern ─────────┐
   │                             │
Phase 2  Vokabular im Alltag     │      ← eigenständig auslieferbar
   │                             │
   │                        Phase 3  Vergleichs-Engine
   │                             │
   └──────────┬──────────────────┤
              │                  │
    Phase 5.1 / 5.2       Phase 4  Vergleichsansicht
    Radar-Filter                   │
                          ┌────────┴────────┐
                    Phase 5.3          Phase 6  Export
                    Radar Overlay           │
                          └────────┬────────┘
                                   │
                              Phase 7  Härtung
```

Die Phasen 1 und 3 sind reine Logik und tragen die Testlast. Die Phasen 2, 4, 5 und 6 sind Oberfläche und sollten wenig eigene Logik enthalten — findet sich dort Rechenarbeit, gehört sie zurück nach 1 oder 3.

---

## 6. Messpunkte

Wird während der Umsetzung ausgefüllt.

| Zeitpunkt | Unit-Tests | Laufzeit | Lint | E2E |
|---|---|---|---|---|
| Baseline (Todo 0.1) | 285 (15 Dateien) | 1,12 s | grün; `format:check` **rot**: `src/components/TreeNav.vue` (Vorbefund, siehe unten) | 9 Szenarien / 65 Schritte grün, 19,8 s |
| Ende Phase 1 | 389 (16 Dateien) | 1,05 s | grün | 9 / 65 grün, 18,4 s |
| Ende Phase 2 | | | | |
| Ende Phase 3 | | | | |
| Ende Phase 4 | | | | |
| Ende Phase 5 | | | | |
| Ende Phase 6 | | | | |
| Abnahme (Todo 7.6) | | | | |

**Anmerkung zur Baseline (2026-09-07):** `npm run format:check` war bereits vor der ersten Code-Änderung rot — `src/components/TreeNav.vue` ist unformatiert (Vorbefund aus Commit `4c4c324`). Da Arbeitsregel §1 grünes `format:check` verlangt, wird die Datei in Todo 0.2 mitformatiert; die Änderung ist rein kosmetisch und wird im Commit als Vorbefund ausgewiesen.

---

## 7. Risiken

| Risiko | Warum es zählt | Gegenmaßnahme |
|---|---|---|
| **Ähnlichkeitssuche findet den Hauptfall nicht** | `".net core"` ↔ `"dotnet core"` liegt bei Distanz 3, außerhalb der MCP-Schwellen | Todo 1.6 testet genau dieses Paar; Token-Überlappung ist Pflicht, nicht Kür |
| **Zu viele Fehlalarme in der Zuordnung** | Wer zehn falsche Vorschläge wegklickt, nutzt die Funktion nicht mehr | Kalibrierte Schwellen aus §2.1; Gegenbeispiele als Test; verworfene Vorschläge werden gemerkt |
| **Rückjoin auf `answerType` wird ein zweites Mal gebaut** | `TechRadar.vue` hat ihn bereits; zwei Ableitungen driften garantiert auseinander | Todo 2.1 zieht die vorhandene Ableitung heraus, statt eine neue zu schreiben; leerer Join bleibt ein definierter Zustand (`⬚`), kein Fehler |
| **`⊘ unset` wird auf `entry.status` statt `effectiveStatus` gebaut** | Der Vergleich meldete Begriffe als unbewertet, die das Radar bewertet zeigt — und zöge sie zu Unrecht aus `Comparable` | Todo 0.3 hält die Vererbung als eigenes Verhalten fest; Grenzfallliste §3.3 prüft beide Richtungen |
| **Hold-Fallback-Änderung wirkt wie ein Fehler** | Bestehende Radars verlieren sichtbar Blips | Todo 0.3 hält das Altverhalten fest, 5.2 ändert es bewusst und begründet; betrifft nur Blips ohne *jede* Statusquelle; separat auslieferbar |
| **Logik wandert in die Oberfläche** | Macht die Kennzahlen untestbar | Phasen 1 und 3 vor den UI-Phasen; Regel in §5 |
| **`STORAGE_VERSION` wird doch erhöht** | Ältere Builds lehnen die Datei ab | Explizite Arbeitsregel in §1; Todo 7.2 belegt das Gegenteil praktisch |
| **Design und Code driften auseinander** | Das Dokument ist die Abnahmegrundlage | Todo 3.7 bindet die Beispielzahlen an einen Test; Todo 7.5 gleicht am Ende ab |
| **Der `answers`-Modus bleibt eine tote Option** | Er ist im Design ausspezifiziert und über [DE-4](./design-project-comparison.md) direkt erreichbar; ungetestet wird er zur Fehlerquelle | Todo 3.2 baut ihn als gleichrangigen Adapter, nicht als Sonderweg; Todo 4.3 testet das Umschalten |
