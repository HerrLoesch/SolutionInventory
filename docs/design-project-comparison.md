# Design: Projektvergleich (Project Comparison)

## 1. Motivation

Innerhalb eines Workspaces existieren häufig mehrere Projekte, die jeweils eigene Fragebögen, Technologiebewertungen und ein Radar besitzen. Aktuell fehlt die Möglichkeit, zwei oder mehr Projekte direkt nebeneinander zu vergleichen. Genau das wird immer dann gebraucht, wenn Entscheidungen über Standardisierung, Konsolidierung oder Migration anstehen:

- **Architektur-Reviews** — Wie unterscheiden sich die Stacks zweier Services?
- **Governance & Standardisierung** — Welche Projekte weichen von der bevorzugten Bewertung ab?
- **Risikobewertung** — Wo gibt es kritische Diskrepanzen (z. B. ein Projekt nutzt eine Technologie auf „Adopt", ein anderes bewertet sie mit „Hold")?

Ein Vergleich ist aber nur so belastbar wie die Benennungen, auf denen er beruht. Wenn Projekt 1 „Dotnet Core" schreibt und Projekt 2 „.net core", meldet ein naiver Vergleich zwei Technologien, die in genau einem Projekt vorkommen — und übersieht die eigentliche Frage, ob beide Projekte dieselbe Bewertung vergeben haben. Das Konzept behandelt diesen Umstand deshalb nicht als Randfall, sondern als tragende Anforderung: **§2** beschreibt den Workflow, der zu eindeutigen Bezeichnungen führt, **§3** das gemeinsame Vokabular, das sie festhält.

*Ausblick: Ein Portfolio-Überblick über die technologische Diversität aller Projekte hinweg wäre ein naheliegendes Folgefeature. Das MVP liefert dafür keine eigene Kennzahl.*

---

## 2. Der Workflow: drei Phasen

Der Projektvergleich ist die letzte von drei aufeinander aufbauenden Phasen. Jede Phase erzeugt ein Artefakt, auf dem die nächste arbeitet.

```
   Phase 1                Phase 2                     Phase 3
   ERHEBEN         →      KONSOLIDIEREN        →      VERGLEICHEN
   ─────────              ─────────────               ───────────
   Projekt anlegen,       Alternativen bewerten,      Projekte
   Fragenkataloge         Empfehlungen begründen,     nebeneinander
   ausfüllen              Radar kuratieren            stellen

   pro Projekt            pro Projekt                 über Projekte

   ↓ Artefakt             ↓ Artefakt                  ↓ Artefakt
   Fragebögen mit         Ein Radar mit Tools         Comparison-Report
   Antworten              und Practices

        ╰────────────────────┴───────────────────────────╯
                             │
                  gemeinsames VOKABULAR
        wächst in Phase 1+2, wird in Phase 3 vorausgesetzt
```

### 2.1 Phase 1 — Erheben

Ein Projekt wird angelegt und seine Fragebögen werden ausgefüllt. Antworten sind zunächst bewusst frei formulierbar: Wer erhebt, soll nicht durch Benennungsdiskussionen ausgebremst werden.

Damit trotzdem so wenig Drift wie möglich entsteht, schlägt das Eingabefeld neben den Katalog-Beispielen auch **alle bereits im Workspace etablierten Begriffe** vor (§3.3). Der einfachste Weg ist damit auch der konsistente.

**Artefakt:** Fragebögen mit Antworten, je Antwort eine Technologie/Praxis, ein Status und eine Begründung.

### 2.2 Phase 2 — Konsolidieren

Die erhobenen Alternativen werden gemeinsam bewertet, die Empfehlungen begründet, und daraus wird das Radar des Projekts abgeleitet: Welche Einträge sind die konsolidierte Aussage des Projekts, auf welchem Ring stehen sie?

Diese Phase ist der Ort, an dem **Benennungen verbindlich werden**. Wer hier entscheidet, dass der Eintrag „.NET Core" heißt, legt fest, woran Phase 3 später vergleicht. Zwei Dinge gehören deshalb hierher:

- Die kuratierten Einträge landen in **einem Radar**, in dem sich Tools und Practices über einen Toggle getrennt betrachten lassen (DE-11). Beides sind unterschiedliche Diskussionen, teilen sich aber dieselben Kategorien und damit dieselben Quadranten.
- Uneindeutige Bezeichnungen werden auf einen **kanonischen Begriff** gezogen — direkt im Blip-Detail des Radars (§3.4). Was hier liegen bleibt, fängt der Vergleich später auf (§5.1); das Vokabular ist workspace-weit, es ist also gleichgültig, aus welchem Projekt heraus ein Begriff entsteht.

**Artefakt:** Das Radar des Projekts mit Tools und Practices, gestützt auf Begriffe aus dem gemeinsamen Vokabular.

### 2.3 Phase 3 — Vergleichen

Mehrere Projekte werden nebeneinandergestellt. Verglichen wird ausschließlich über **kanonische Begriffe** (DE-2), nicht über Rohtext — nur so misst der Vergleich Bewertungsunterschiede statt Schreibweisenunterschiede.

Weil Phase 1 tolerant ist, kann der Vergleich auf unaufgelöste Bezeichnungen treffen. Er verschweigt das nicht, sondern weist vor der Auswertung aus, wie vokabularsauber die selektierten Projekte sind, und bietet die Zuordnung direkt an (§5.1).

**Artefakt:** Comparison-Report für die gewählte Art-Auswahl, exportierbar als JSON oder HTML.

### 2.4 Das Vokabular als verbindendes Element

Das Vokabular ist kein separater Pflegeschritt, sondern fällt in den Phasen 1 und 2 nebenbei an und wird in Phase 3 eingefordert:

| Phase | Beitrag zum Vokabular |
|---|---|
| **1 Erheben** | Nutzt es passiv als Vorschlagsquelle; jede übernommene Empfehlung verhindert eine neue Variante. |
| **2 Konsolidieren** | Etabliert Begriffe aktiv: Wer kuratiert, entscheidet über die verbindliche Schreibweise und die Art (Tool/Practice). |
| **3 Vergleichen** | Setzt es voraus, macht Lücken sichtbar und bietet die Zuordnung als letzten Auffangpunkt an. |

---

## 3. Das gemeinsame Vokabular

> **Entscheidung: Alias-Register auf Workspace-Ebene.** Antworten und Radar-Blips bleiben Freitext; das Vokabular legt sich als Auflösungsschicht darüber. Damit wirkt es rückwirkend auf alle Bestandsdaten und erfordert keine Migration des Antwortmodells.

### 3.1 Datenmodell

```js
workspace.vocabulary = [
  {
    id: 'term-dotnet-core',
    name: '.NET Core',            // kanonische Anzeigeform
    kind: 'tool',                 // 'tool' | 'practice' — steuert den Art-Filter
    aliases: [                    // normalisiert gespeichert; normalize(name)
      'dotnet core',              // === '.net core' zählt implizit als Alias
      'netcore',                  // und wird hier nicht wiederholt
      'dotnetcore'
    ],
    note: 'Ab Version 5 als .NET geführt, hier bewusst zusammengefasst.',
    createdAt: '2026-08-26T10:12:00Z'
  }
]
```

**Invarianten:**

- Ein Alias gehört zu **höchstens einem** Begriff. Beim Zusammenführen wird das geprüft; Kollisionen muss der Nutzer auflösen.
- `normalize(name)` zählt implizit als Alias und muss nicht doppelt gepflegt werden.
- Das Umbenennen eines Begriffs ändert `name`, nicht `id` — bestehende Blips, Overrides und Exporte bleiben gültig.
- `kind` ist die **einzige** Quelle für die Art (Tool oder Practice) eines aufgelösten Begriffs.

### 3.2 Auflösung

```
normalize(s) = s.trim().toLowerCase().replace(/\s+/g, ' ')

resolve(rawName):
  n = normalize(rawName)
  1. Begriff mit normalize(name) === n            → Treffer
  2. Begriff mit n in aliases                     → Treffer
  3. sonst                                        → unaufgelöst
```

Ein **unaufgelöster** Name verschwindet nicht aus dem Vergleich — er wird mit seinem Rohtext geführt und mit `◌` markiert. Damit fällt das Verhalten im schlimmsten Fall auf exaktes Textmatching zurück, also auf den Stand ohne Vokabular, und der Nutzer sieht an der Markierung, dass diese Zeile unter Vorbehalt steht.

**Ähnlichkeitssuche** (Levenshtein-Distanz auf normalisierten Namen plus Token-Überlappung) wird ausschließlich zum **Vorschlagen** in der Zuordnungsansicht eingesetzt, nie zum automatischen Matching. Ein Vorschlag wird erst wirksam, wenn ein Mensch ihn bestätigt — und ist danach als Alias dauerhaft festgehalten, statt bei jedem Vergleich neu geraten zu werden.

### 3.3 Rückkopplung in Phase 1

`getSuggestions(entry, answerType)` liefert heute nur die `examples[]` des jeweiligen Katalog-Entries. Künftig werden die Vokabularbegriffe der passenden Art dazugemischt und optisch als etablierte Begriffe markiert:

```
┌─ Solution ─────────────────────────────────┐
│ dotnet                                     │
├────────────────────────────────────────────┤
│  📐 .NET Core            im Vokabular      │  ← Vokabular
│  📐 .NET Framework       im Vokabular      │
│     dotnet-sdk                             │  ← Katalog-Beispiel
└────────────────────────────────────────────┘
```

Katalog-Beispiele, die bereits Alias eines Begriffs sind, werden dabei **unterdrückt** — sonst stünde „Dotnet Core" direkt neben „.NET Core" und der Vorschlag würde die Variante wieder anbieten, die das Vokabular gerade eingesammelt hat.

Das schließt den Kreis: Was in Phase 2 einmal als Begriff etabliert wurde, ist in Phase 1 der bequemste Vorschlag — Drift entsteht gar nicht erst.

### 3.4 Wo Begriffe entstehen

Das Vokabular hat bewusst **keinen eigenen Navigationspunkt**. Es wird an den zwei Stellen gepflegt, an denen die Begriffe ohnehin anfallen:

| Ort | Phase | Wofür |
|---|---|---|
| **Blip-Detail im Radar** | 2 Konsolidieren | Beim Kuratieren eines Eintrags: zeigt den aufgelösten Begriff oder bietet „zuordnen / neu anlegen" an. Der Ort, an dem über die Benennung ohnehin gesprochen wird. |
| **Vocabulary-Sektion im Vergleich** (§5.1) | 3 Vergleichen | Sammelansicht über alle selektierten Projekte, mit Ähnlichkeitsvorschlägen und Sammelaktionen. Der Auffangpunkt für alles, was in Phase 2 liegen geblieben ist. |

Beide schreiben in dasselbe workspace-weite Register. Es ist deshalb gleichgültig, aus welchem Projekt oder welcher Phase heraus ein Begriff entsteht — und Phase 2 kann ihre Benennungsentscheidung dort festhalten, wo sie getroffen wird, statt sie bis zum Vergleich zu vertagen.

```
┌─ Blip: „Dotnet Core" ──────────────────────────────┐
│  Entry     Programming Languages                   │
│  Status    [ Adopt ▾ ]                             │
│  Kategorie [ Languages ▾ ]                         │
│                                                    │
│  Begriff   ◌ nicht im Vokabular                    │
│            ähnlich zu  .NET Core  📐 Tool          │
│            [Zuordnen]   [Als eigenen Begriff]      │
└────────────────────────────────────────────────────┘
```

---

## 4. Übersicht des Vergleichs-Features

Der Projektvergleich wird über einen **Workspace-Node** in der TreeNav ausgelöst — analog dazu, wie ein Klick auf ein Projekt dessen Projektansicht öffnet.

### 4.1 Navigation: Workspace-Node in der TreeNav

Die bestehende, nicht klickbare Sektionsüberschrift „Projects" wird durch einen **klickbaren Workspace-Node** ersetzt:

```
TreeNav (linke Sidebar)
──────────────────────────
Question Catalogs
  📄 Standard Catalog
  📄 Interview Catalog
──────────────────────────
📦 Workspace       3 proj.   ← NEU: ersetzt die Überschrift „Projects"
  📁 Project Alpha           ← wie bisher
    📄 Questionnaire 1
    📄 Questionnaire 2
  📁 Project Beta
    📄 Questionnaire 3
  📁 Project Gamma
    📄 Questionnaire 4
```

- **Icon**: `mdi-briefcase-outline`, visuell abgesetzt von den Projekt-Ordnern (`mdi-folder`).
- **Label**: Workspace-Name plus Chip mit der Projektanzahl.
- **Klick** öffnet einen neuen Tab-Typ `workspace-comparison` — gleiches Muster wie `project-summary`.
- **Weniger als zwei Projekte im Workspace**: Der Node wird deaktiviert dargestellt (Tooltip: „Mindestens zwei Projekte nötig"). Das ist bewusst härter als der bloße Hinweis bei zu kleiner Projektauswahl (§4.2): Hier fehlt die Voraussetzung im Workspace selbst und lässt sich im Vergleich nicht beheben; dort ist die Unterselektion eine jederzeit umkehrbare Entscheidung des Nutzers.

Das Vokabular bekommt **keinen eigenen Navigationspunkt**; es wird im Blip-Detail des Radars und in der Vocabulary-Sektion des Comparison-Tabs gepflegt (§3.4).

### 4.2 Projektauswahl und Art-Filter

Standardmäßig sind **alle Projekte selektiert** und **beide Arten eingeblendet**. Bei weniger als zwei selektierten Projekten wird ein Hinweis statt der Vergleichsansicht angezeigt — die Auswahl wird nicht hart erzwungen.

```
┌──────────────────────────────────────────────────────────────────┐
│ 📦 Workspace Comparison                             [Export ▾]  │
├──────────────────────────────────────────────────────────────────┤
│ Projects: ☑ Alpha  ☑ Beta  ☑ Gamma        Data source: [Radar ▾] │
│ Kind:     ☑ 📐 Tools   ☑ 🔷 Practices   ☑ ⬚ Unassigned           │
└──────────────────────────────────────────────────────────────────┘
```

Der Art-Filter arbeitet auf `kind` des aufgelösten Begriffs — dasselbe Muster wie der bestehende Status-Filter im Radar. **Alle Kennzahlen bis auf die Vokabular-Abdeckung rechnen sich auf die aktive Auswahl neu** (die Ausnahme ist in §5.1 begründet). Wer Tools und Practices getrennt bewerten will, blendet eine Art aus und liest die Kennzahlen erneut ab; wer den Gesamtstand sehen will, lässt beide an. Die Vermischung ist damit eine bewusste Entscheidung des Nutzers, kein Nebeneffekt.

`⬚ Unassigned` sammelt Begriffe, deren **Art** weder aus dem Vokabular noch aus `answerType` bestimmbar ist. Sie sind standardmäßig sichtbar, damit sie nicht unbemerkt aus der Auswertung fallen.

*`⬚` und `◌` sind zwei verschiedene Dinge und werden deshalb nicht mit demselben Zeichen markiert: `◌` heißt „nicht im Vokabular aufgelöst" (Identität unklar), `⬚` heißt „Art unbekannt". Eine unaufgelöste Bezeichnung mit gesetztem `answerType` ist `◌`, aber nicht `⬚`; ein aufgelöster Begriff ist nie `⬚`, weil `kind` am Begriff Pflicht ist.*

### 4.3 Datenquelle

Die Vergleichsdaten stammen primär aus den **kuratierten Radar-Blips**. Ein Dropdown `Data source: [Radar ▾]` schaltet auf den vollständigen Fragebogen-Datensatz um.

| Modus | Vergleichseinheit | Rohname | Status | Umfang |
|---|---|---|---|---|
| **Radar** (Standard) | Blip aus `project.radar[]` | `option` | `effectiveStatus` (s. u.) | Nur explizit kuratierte Einträge |
| **All answers** | Antwort aus den Fragebögen der selektierten Projekte | `technology` | `answer.status` | Vollständig, aber potentiell viel Rauschen |

Der Umschalter tauscht **ausschließlich die Vergleichseinheit** aus. Alles, was darauf aufbaut — Auflösung (§3.2), Art-Bestimmung (DE-11), Coverage (DE-6), Statusdistanz (§6.1) und sämtliche Kennzahlen (§5.2) — arbeitet in beiden Modi unverändert auf dem Tripel `(Rohname, Status, Art)`. Wo dieses Dokument der Kürze halber von „Blips" spricht, gilt die Aussage im All-answers-Modus sinngemäß für Antworten.

#### Datenmodell-Bezug

- Ein Radar-Blip liegt in `project.radar[]` und trägt `entryId`, **`option`** (der Rohname — *nicht* `technology`, das ist das Namensfeld der Fragebogen-Antwort), `category`, `status`, `shortComment`, `description`, `link` sowie optional `mandatory`.
- Ein Blip ist über das Paar **`(entryId, option)`** eindeutig, nicht über `option` allein → DE-3. Eine **Antwort** ist über `(questionnaireId, entryId, technology)` eindeutig; DE-3 greift dort genauso, weil derselbe Begriff in mehreren Fragebögen eines Projekts beantwortet sein kann.
- **`entry.status` kann leer sein — der Blip ist damit aber nicht statuslos.** `TechRadar.vue` bildet heute `effectiveStatus = entry.status || answer.status`: Ein Blip ohne kuratierten Status erbt den der Fragebogen-Antwort und wird im Radar sichtbar bewertet dargestellt. Der Vergleich verwendet dieselbe Ableitung. `⊘ unset` (DE-7) gilt erst, wenn **beide** Quellen leer sind — läse der Vergleich nur `entry.status`, meldete er reihenweise Begriffe als unbewertet, die das Radar bewertet zeigt.
- `radarCategoryQuadrants`, `radarQuadrantLabels` und `radarCategoryOrder` sind **pro Projekt** konfiguriert und bleiben durch DE-11 **unverändert** — Tools und Practices teilen sich ein Quadranten-Layout.
- `answerType` hängt an der Fragebogen-Antwort und wird nicht *persistiert* in den Blip kopiert. **Der dafür nötige Rückjoin existiert aber bereits:** `TechRadar.vue` verbindet Blip und Antwort über `entryId` plus kleingeschriebenen Namensvergleich (`option` ↔ `technology`) und legt `answerType` auf das Blip-Viewmodel. Der Vergleich nutzt diese Ableitung, statt eine zweite zu bauen. Findet der Join nichts — etwa weil Entry oder Antwort inzwischen gelöscht wurden — gilt der Blip als `⬚ unassigned`.
- **Schreibweise der Art:** `answerType` liefert `'Tool'` / `'Practice'`, das Vokabular führt `kind` als `'tool'` / `'practice'`. Die Abbildung ist ein `toLowerCase()`; jeder andere Wert, leer eingeschlossen, ergibt `unassigned`.
- **Kategorie im All-answers-Modus:** Antworten ohne Blip haben keine kuratierte `category`. Es gilt dann die natürliche Kategorie des Entries aus dem Fragenkatalog — dieselbe Quelle, die `TechRadar.vue` schon heute als Fallback nutzt (`effectiveCategory = entry.category || questionnaireCategory`). Kennt das Referenzprojekt sie nicht, landet der Punkt wie jeder andere Fremdling im Restquadranten „Other" (§5.4).
- `mandatory` bleibt im Vergleich unberücksichtigt.

*Hinweis: `statusOptions` sind laut `catalog.schema.json` pro Katalog definiert. Ein importierter Katalog könnte theoretisch andere Status-Labels mitbringen und damit die fünfstufige Skala aus §6.1 aufbrechen. Aktuell unkritisch, weil die UI die globale Liste aus `categoriesService` bindet.*

### 4.4 Getroffene Design-Entscheidungen

#### DE-1: Vergleichsgranularität — begriffszentriert

> **Entscheidung: Der Vergleich findet auf Ebene des kanonischen Begriffs statt.**

Zeilen der Vergleichsansicht sind **Begriffe**, nicht Katalog-Entries — aufgelöste Vokabulareinträge oder, solange sie das nicht sind, die normalisierte Bezeichnung selbst (`◌`, DE-2). Entry-IDs und Kategorien sind für Matching und Kennzahlen irrelevant, da verschiedene Projekte verschiedene Fragenkataloge nutzen und denselben Begriff in unterschiedlichen Kategorien führen können.

Der Entry bleibt als **Herkunftsinformation** pro Projektzelle erhalten und wird angezeigt, geht aber nicht in Matching oder Statistik ein.

#### DE-2: Matching-Strategie über Projekte

> **Entscheidung: Matching über die Begriffs-ID aus dem Vokabular, mit Rohtext als Rückfall.**

Zwei Blips gelten als derselbe Begriff, wenn `resolve(option)` dieselbe `term.id` liefert. Damit vergleicht das Feature Bewertungen und nicht Schreibweisen: „Dotnet Core [Adopt]" und „.net core [Hold]" treffen aufeinander, sobald beide Schreibweisen auf `term-dotnet-core` zeigen.

Bleibt ein Name unaufgelöst, wird auf **exaktes, normalisiertes Textmatching** zurückgefallen und die Zeile mit `◌` markiert. Der Vergleich ist damit nie schlechter als ohne Vokabular, macht seine Unsicherheit aber sichtbar.

**Folge:** Die Alias-Auflösung kann Divergenzen aufdecken, die Namensdrift bisher verborgen hat. Werden zwei zuvor getrennte Zeilen zu einer zusammengeführt, entsteht daraus je nach Status ein `✓ match`, eine echte Abweichung — oder innerhalb eines Projekts ein `⚠ inconsistent` nach DE-3. Genau das ist der Zweck.

#### DE-3: Mehrere Blips desselben Begriffs innerhalb eines Projekts

> **Entscheidung: Alle Ausprägungen in der Zelle zeigen, Begriff als `⚠ inconsistent` einstufen.**

Da ein Blip über `(entryId, option)` eindeutig ist, kann ein Projekt denselben Begriff unter zwei Entries mit unterschiedlichem Status führen — nach der Alias-Auflösung sogar unter zwei verschiedenen Schreibweisen. Dieser Fall tritt im Standardmodus auf und wird nicht wegdefiniert.

Die Projektzelle listet dann alle Ausprägungen mit Entry und Rohnamen als Herkunft. Für den Begriff wird **keine Statusdistanz berechnet** — er erhält `⚠ inconsistent` und fällt aus `Comparable` heraus (DE-8), bis das Quellprojekt bereinigt ist.

```
Alpha-Radar:  ORM Framework → "EF Core"               [Adopt]
              Data Access   → "Entity Framework Core" [Hold]
              beide lösen auf zu  term-ef-core

┌────────────┬──────────────────────────────────────┬───────┬────────────────┐
│ Term       │ Alpha                                │ Beta  │ Δ Status       │
├────────────┼──────────────────────────────────────┼───────┼────────────────┤
│ EF Core    │ Adopt ↳ORM Framework ("EF Core")      │ Trial │ ⚠ inconsistent │
│            │ Hold  ↳Data Access ("Entity Frame…")  │       │                │
└────────────┴──────────────────────────────────────┴───────┴────────────────┘
```

#### DE-4: Projekte ohne Radar-Blips

> **Entscheidung: Nur warnen, im Radar-Modus bleiben.**

Hat ein selektiertes Projekt in der aktiven Art-Auswahl keine Blips, wird ein Info-Banner angezeigt. Der Vergleich **bleibt im Radar-Modus**, das Projekt erscheint als leere Spalte. Ein einzelnes ungepflegtes Projekt soll den gesamten Vergleich nicht in den Rausch-Modus kippen.

```
ⓘ Project Gamma hat keine Radar-Einträge in dieser Auswahl und erscheint als leere Spalte.
  [Alle Fragebogen-Antworten einbeziehen]   [Gamma abwählen]
```

#### DE-5: Criticality-Override-Persistierung

> **Entscheidung: Global pro Begriffs-ID, mit protokolliertem Kontext.**

Ein Override wird am Schlüssel `term.id` gespeichert und gilt workspace-weit. Weil die ID beim Umbenennen stabil bleibt, überlebt der Override sowohl Umbenennungen als auch das nachträgliche Zusammenführen von Schreibweisen.

**Ein Override kann nur auf einen aufgelösten und vergleichbaren Begriff gesetzt werden.** Versucht der Nutzer es auf einer `◌`-Zeile, bietet die UI zuerst die Zuordnung an — das verhindert verwaiste Overrides auf Schreibweisen, die kurz darauf verschwinden. Ebenso wenig ist er auf einem Begriff möglich, der bereits aus einem anderen Grund aus `Comparable` fällt (`⚠ inconsistent`, `⊘ unset`) oder gar nicht verglichen wird (`◑ unique`): Dort gibt es keine automatische Einstufung, die zu überschreiben wäre.

Kippt eine Zeile *nachträglich* in einen dieser Zustände, bleibt der Override gespeichert, wird aber vom Badge nach der Rangfolge in §5.3 überstimmt — und die Kontextprüfung unten meldet ihn ohnehin als überprüfungsbedürftig. So kann derselbe Begriff nie in zwei Ausschlussgründen gleichzeitig gezählt werden (DE-8).

Damit ein akzeptierter Unterschied keine später hinzukommende Abweichung stillschweigend unterdrückt, wird der Kontext mitgespeichert:

```js
overrides['term-azure-devops'] = {
  level: 'accepted',
  comment: 'Legacy-Service, Migration ist beauftragt',
  setAt: '2026-08-26T10:12:00Z',
  contextProjects: ['project-a1b2', 'project-c3d4'],
  contextStatuses: { 'project-a1b2': 'Trial', 'project-c3d4': 'Hold' }
}
```

Weicht die aktuelle Projektmenge oder ein Status davon ab, zeigt die UI statt „manually set" den Hinweis **„manually set — Kontext hat sich geändert"**. Der Override bleibt wirksam, wird aber sichtbar als überprüfungsbedürftig markiert.

#### DE-6: Abdeckung und Divergenz sind zwei Dimensionen

> **Entscheidung: Zwei getrennte Spalten — Coverage und Δ Status.**

Wie viele Projekte einen Begriff einsetzen und wie einig sie sich über dessen Bewertung sind, sind unabhängige Fragen.

| Coverage | Bedeutung |
|---|---|
| `◉ all` | In allen selektierten Projekten vorhanden |
| `◐ partial` | In mindestens zwei, aber nicht allen Projekten |
| `◑ unique` | Nur in genau einem Projekt vorhanden |

Δ Status wird für `◉ all` und `◐ partial` berechnet; bei `◑ unique` steht dort `—`.

*Ein `◑ unique` auf einer `◌`-Zeile ist der klassische Scheinunterschied und wird in der Matrix gesondert hervorgehoben. Er hat allerdings **zwei Hälften**: Löst „PostgreSQL" in Alpha auf und bleibt „postgres" in Beta unaufgelöst, entstehen zwei `◑ unique`-Zeilen, von denen nur die unaufgelöste ein `◌` trägt. Die Matrix markiert deshalb auch die aufgelöste Gegenseite, sobald ihr ein unaufgelöster Name der aktiven Auswahl laut Ähnlichkeitssuche (§3.2) nahekommt — sonst sähe genau die Hälfte des Problems sauber aus.*

#### DE-7: Blips ohne Status

> **Entscheidung: Eigene Kategorie `⊘ unset`, nie als Abweichung gewertet.**

„Ohne Status" heißt hier: `effectiveStatus` ist leer, also **weder** am Blip **noch** an der zugehörigen Fragebogen-Antwort ein Status gesetzt (§4.3). Ein Blip, dem nur der kuratierte Status fehlt, gilt als bewertet — das Radar zeigt ihn heute schon so.

Für diese Restmenge mappt die bestehende Radar-Darstellung auf Hold (`statusToRing` fällt auf den Hold-Ring zurück). Für den Vergleich wäre das irreführend — ein Projekt, das einen Begriff schlicht nicht bewertet hat, würde sonst gegen ein Adopt-Projekt als kritische Abweichung gemeldet. Hat mindestens ein beteiligtes Projekt keinen `effectiveStatus`, erhält der Begriff `⊘ unset` und geht nicht in die Statusdistanz ein.

#### DE-8: Bezugsgröße der Kennzahlen

> **Entscheidung: Alle Quoten beziehen sich auf `Comparable`.**

```
Compared    = Begriffe mit Coverage ◉ all oder ◐ partial
Excluded    = Compared-Begriffe mit ⊘ unset, ⚠ inconsistent oder ✎ accepted
Comparable  = Compared − Excluded

Matches + Minor + Significant + Critical = Comparable
```

**`Excluded` zählt ausschließlich innerhalb von `Compared`.** Ein `◑ unique`-Begriff kann durchaus intern uneinheitlich (DE-3 braucht dafür nur ein Projekt) oder unbewertet sein — er war aber nie Teil von `Compared`. Würde er mitgezählt, zöge die Subtraktion etwas ab, das nie drin war, und `Comparable` fiele zu klein aus.

Weil jede Zeile nach §5.3 **genau ein** Δ-Badge trägt, ist ein Begriff außerdem nie in zwei Ausschlussgründen gleichzeitig. Die drei Zahlen addieren sich damit überschneidungsfrei zu `Excluded` und werden in der Summary Card einzeln beziffert (§5.2).

Die **Vokabular-Abdeckung ist bewusst kein vierter Ausschlussgrund.** Unaufgelöste Namen bleiben vollwertig in der Rechnung, weil ihr Ausschluss den Vergleich in einem frischen Workspace entkernen würde. Stattdessen qualifiziert die Abdeckungsanzeige (§5.1) das Gesamtergebnis: Sie sagt, *wie sehr* man den Zahlen trauen darf.

#### DE-9: Vokabular als Alias-Register

> **Entscheidung: Auflösungsschicht statt Fremdschlüssel im Antwortmodell.**

Antworten und Blips behalten ihren Rohtext; das Vokabular bildet ihn auf kanonische Begriffe ab. Vorteile: wirkt rückwirkend auf alle Bestandsdaten, benötigt keine Migration von `answers[]` oder `radar[]`, und ein gelöschter Vokabulareintrag macht keine Antwort kaputt — sie wird nur wieder unaufgelöst.

Der Preis ist eine Auflösung zur Laufzeit. Bei den hier üblichen Größenordnungen ist ein einmalig aufgebauter Alias-Index pro Vergleich völlig ausreichend.

#### DE-10: Verbindlichkeit des Vokabulars

> **Entscheidung: Tolerant beim Erfassen, mit Bereitschaftsanzeige im Vergleich.**

Freitext bleibt in Phase 1 und 2 jederzeit erlaubt — eine Erhebung soll nicht an einer Benennungsdiskussion hängenbleiben. Die Verbindlichkeit entsteht erst dort, wo sie gebraucht wird: Der Vergleich weist pro Projekt die Vokabular-Abdeckung aus, warnt vor möglichen Scheinunterschieden und bietet die Zuordnung direkt an (§5.1).

#### DE-11: Tech und Pattern sind ein Filter, keine getrennten Ansichten

> **Entscheidung: Ein Radar und ein Vergleich, in denen sich die Art über einen Toggle ein- und ausblenden lässt.**

Tools und Practices werden selten gegeneinander abgewogen — sie brauchen deshalb eine **trennbare Darstellung**, aber keine getrennte Struktur. Ein Toggle leistet dasselbe wie zwei Ansichten und kostet einen Bruchteil.

Ausschlaggebend ist, dass sich beide Arten **dieselben Kategorien teilen**: Ein Quadrant heißt „Data Storage", gleichgültig ob dort PostgreSQL (Tool) oder Event Sourcing (Practice) liegt. Quadranten aus den Kategorien abzuleiten und sie dann nach Art zu spalten würde bedeuten, entweder Kategorien über zwei Layouts zu duplizieren oder eines davon halbleer zu lassen. Ein gemeinsames Layout ist dem Datenmodell treuer.

Konkret bleibt damit **alles bestehende unverändert**: Blips liegen weiter in einem gemeinsamen `project.radar[]`, die Quadranten-Konfiguration bleibt pro Projekt und braucht keine zweite Dimension, und die Projektansicht behält ihre drei Tabs. Die Radar-Komponente bekommt lediglich ein `visibleKinds`-Set neben dem bereits vorhandenen `visibleStatuses` — dasselbe Muster in derselben Komponente.

**Bestimmung der Art eines Blips:**

1. Begriff aufgelöst → `term.kind` entscheidet.
2. Unaufgelöst → `answerType` der zugehörigen Fragebogen-Antwort entscheidet.
3. Beides leer → `unassigned`. Der Blip wird trotzdem geplottet, aber blass, und der eigene Toggle `⬚ Unassigned` macht ihn gezielt auffindbar.

Punkt 3 ist der Grund, warum die Art ein Filter und keine Aufteilung ist: In einer Zwei-Ansichten-Welt hätte ein unbestimmter Blip keine Heimat und müsste in eine Restliste ausweichen. Als Filterwert ist er einfach ein dritter Zustand.

### 4.5 Nicht im MVP

| Ausgeklammert | Begründung |
|---|---|
| **Aufschlüsselung nach Kategorie** | Braucht durch DE-1/DE-2 einen katalogübergreifenden Schlüssel, den es nicht gibt. Jede Zuordnung wäre perspektivisch oder würde zu Doppelzählungen führen. |
| **Automatisches Übernehmen von Ähnlichkeitstreffern** | Ähnlichkeit schlägt nur vor; die Bestätigung bleibt beim Menschen (§3.2). Ein „alles automatisch zusammenführen" würde genau die Fehler erzeugen, die das Vokabular verhindern soll. |
| **Import/Export des Vokabulars** | Sinnvoll, um Begriffe zwischen Workspaces zu teilen — aber unabhängig vom Vergleich umsetzbar. |
| **Hierarchische Begriffe** | Etwa „.NET Core" als Spezialisierung von „.NET". Das MVP kennt nur flache Begriffe mit Aliasen. |

---

## 5. Vergleichsansicht

Die Vergleichsansicht besteht aus vier ein- und ausklappbaren Abschnitten: Vocabulary, Summary Card, Comparison Matrix und Radar Overlay.

### 5.1 Section: Vocabulary

Der erste Abschnitt beantwortet die Frage, ob dem Rest der Seite zu trauen ist. Er ist eingeklappt, solange alle selektierten Projekte vollständig aufgelöst sind, und klappt automatisch auf, sobald es offene Bezeichnungen gibt.

```
┌─ Vocabulary ──────────────────────────────────────────────── ▾ ──┐
│  Abdeckung   Alpha  ██████████  100 %                            │
│              Beta   ████████░░   82 %   4 offen                  │
│              Gamma  ██████░░░░   61 %   9 offen                  │
│                                                                  │
│  ⚠ 13 unaufgelöste Bezeichnungen können Scheinunterschiede       │
│    erzeugen — betroffene Zeilen sind mit ◌ markiert.             │
│                                    [Alle exakten Treffer (5)]    │
├──────────────────────────────────────────────────────────────────┤
│  Vorschläge                                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ "postgres"      Beta · Data Storage                        │  │
│  │ "Postgre SQL"   Gamma · Data Storage                       │  │
│  │      ähnlich zu   PostgreSQL  📐 Tool                      │  │
│  │      [Beide zuordnen]  [Eigener Begriff]  [Später]         │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │ "Circuit Breaker Pattern"   Beta · Resilience              │  │
│  │      ähnlich zu   Circuit Breaker  🔷 Practice             │  │
│  │      [Zuordnen]  [Eigener Begriff]  [Später]               │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │ "Wolverine"    Gamma · Messaging        kein Vorschlag     │  │
│  │      [Eigener Begriff ▾]  [Später]                         │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**Kennzahl.** Die Vokabular-Abdeckung eines Projekts ist `aufgelöste eindeutige Bezeichnungen / eindeutige Bezeichnungen`. Sie zählt Bezeichnungen, nicht Vergleichseinheiten — zehn Blips mit derselben unbekannten Schreibweise sind ein Problem, nicht zehn. Grundmenge sind die Vergleichseinheiten der **aktiven Datenquelle** (§4.3): im Radar-Modus die Blips des Projekts, im All-answers-Modus seine Antworten. Der Umschalter ändert die Abdeckung also — er ändert ja auch, welche Bezeichnungen der Vergleich überhaupt anfasst.

**Dieser Abschnitt ignoriert den Art-Filter als einziger.** Würde er ihm folgen, verschwänden beim Ausblenden von `⬚ Unassigned` genau die Bezeichnungen aus der Ansicht, die weder Begriff noch `answerType` haben — also die, die am dringendsten zugeordnet werden müssen. Die Abdeckung wird deshalb immer über alle Vergleichseinheiten des Projekts gerechnet. Der **Datenquelle** folgt sie dagegen sehr wohl — nur der Art-Filter bleibt ohne Wirkung.

**Aktionen je Bezeichnung:**

| Aktion | Wirkung |
|---|---|
| **Zuordnen** | Der normalisierte Rohname wird als Alias an den Zielbegriff gehängt. Betrifft sofort alle Projekte, nicht nur die selektierten. |
| **Eigener Begriff** | Legt einen neuen Vokabulareintrag an, `name` = Rohname, `kind` vorbelegt aus `answerType`, änderbar im Dropdown. Fehlt `answerType`, gibt es keine Vorbelegung und die Aktion bleibt deaktiviert, bis eine Art gewählt ist: `kind` ist am Begriff Pflicht (§3.1) und darf nicht geraten werden. |
| **Später** | Überspringt die Bezeichnung; sie bleibt unaufgelöst und `◌`-markiert. |
| **Begriffe zusammenführen** | Für den Fall, dass zwei Personen unabhängig `.NET Core` und `dotnet core` als eigenständige Begriffe angelegt haben. Aliase und Rohnamen des Quellbegriffs wandern zum Zielbegriff, der Quellbegriff wird gelöscht. |

**Alle exakten Treffer** legt für alle Bezeichnungen, die sich nach Normalisierung nicht unterscheiden (`"Serilog "` → `"serilog"`), ohne Rückfrage einen Begriff an. Reine Tipp- und Leerzeichenvarianten, kein Ähnlichkeitsraten.

*Wichtig: Die Aktion **ändert das Vergleichsergebnis nicht.** Solche Bezeichnungen matchen laut DE-2 schon über den normalisierten Textrückfall und stehen bereits in einer Zeile. Was sie bringt, ist Abdeckung: Die Zeile verliert ihre `◌`-Markierung, wird als belastbar ausgewiesen und kann einen Override tragen (DE-5).*

**Kollisionen beim Zusammenführen.** Tragen Quell- und Zielbegriff beide einen Criticality-Override, gewinnt der des Zielbegriffs; der Kommentar des Quellbegriffs wird angehängt statt verworfen, und der zusammengeführte Override gilt nach DE-5 als überprüfungsbedürftig. Gehört ein Alias bereits einem dritten Begriff, bricht die Zusammenführung ab und benennt den Konflikt.

**Verworfene Ähnlichkeitsvorschläge** werden pro Namenspaar in `workspace.dismissedSuggestions[]` festgehalten und nicht erneut angeboten. Der Speicher gehört auf Workspace-Ebene und nicht in die Sitzung: Ein Vorschlag, den jemand bewusst abgelehnt hat, soll beim nächsten Öffnen des Tabs nicht wieder oben stehen. Einträge sind Paare normalisierter Namen; wird einer der beiden später doch zugeordnet, verliert der Eintrag seine Wirkung und kann beim nächsten Aufbau des Index entfallen.

### 5.2 Section: Summary Card

Eine einzelne Kennzahlenkarte fasst den Vergleich **für die aktive Art-Auswahl und Datenquelle** zusammen. Es gibt bewusst kein zweites Kennzahlen-Dashboard weiter unten.

```
┌───────────────────────────────────────────────────────────────────┐
│  Comparison Summary                Arten: alle · 3 projects       │
├───────────────────────────────────────────────────────────────────┤
│  VOCABULARY                                                       │
│    Abdeckung             82 %        ◌ 13 unaufgelöst             │
├───────────────────────────────────────────────────────────────────┤
│  COVERAGE                                                         │
│    Total terms             38                                     │
│    ◉ In all projects       24        63 % aller Begriffe          │
│    ◐ Partial                8                                     │
│    ◑ Unique                 6        Alpha 3 · Beta 2 · Gamma 1   │
├───────────────────────────────────────────────────────────────────┤
│  AGREEMENT                                                        │
│    Compared                32                                     │
│    Excluded                 5        ⊘ 2 unset · ⚠ 1 incons. ·    │
│                                      ✎ 2 accepted                 │
│    Comparable              27                                     │
│                                                                   │
│    ✓   Matches             20                                     │
│    ▲   Minor                4                                     │
│    ▲▲  Significant          2                                     │
│    ▲▲▲ Critical             1                                     │
│                                                                   │
│    Agreement             74 %   ██████████░░░░  moderate          │
└───────────────────────────────────────────────────────────────────┘
```

| Kennzahl | Berechnung |
|---|---|
| **Vokabular-Abdeckung** | Summe der aufgelösten eindeutigen Bezeichnungen über alle selektierten Projekte, geteilt durch die Summe ihrer eindeutigen Bezeichnungen. Als einzige Kennzahl **unabhängig vom Art-Filter**, der Datenquelle folgt sie aber (§5.1). Qualifiziert alle folgenden Zahlen. |
| **Total terms** | Vereinigungsmenge aller Begriffe (aufgelöst wie unaufgelöst) in der aktiven Art-Auswahl. |
| **In all projects / Partial / Unique** | Coverage `◉` / `◐` / `◑`; Unique zusätzlich pro Projekt aufgeschlüsselt. |
| **Anteil ◉ all** | `In all projects / Total × 100`. Bewusst nicht „Coverage" genannt — dieses Wort bezeichnet in §5.3 und im Glossar die Klassifikation `◉` / `◐` / `◑`, nicht einen Prozentwert. |
| **Compared** | Begriffe mit Coverage `◉ all` oder `◐ partial`. |
| **Excluded** | Summe aus `⊘ unset`, `⚠ inconsistent`, `✎ accepted`, einzeln ausgewiesen. Jeweils nur unter den `Compared`-Begriffen gezählt und überschneidungsfrei (DE-8). |
| **Comparable** | `Compared − Excluded` — Bezugsgröße für Agreement. |
| **Matches / Minor / Significant / Critical** | Verteilung der Statusdistanz nach §6.1; summieren sich zu `Comparable`. |
| **Agreement** | `Matches / Comparable × 100`. Einstufung: ≥ 85 % *high*, 65–84 % *moderate*, < 65 % *low*. Datenquellenneutral benannt, weil die Kennzahl auch im All-answers-Modus gilt, wo es kein Radar gibt. |

*Ein separater „Deviation Score" wird nicht geführt — er wäre per Definition das Komplement zu Agreement.*

### 5.3 Section: Comparison Matrix

Eine Tabelle mit **einer Zeile pro Begriff** und einer Spalte pro selektiertem Projekt.

```
┌────────────────┬──────────────────────┬───────────┬───────┬──────────┬────────────────┐
│ Term           │ Alpha                │ Beta      │ Gamma │ Coverage │ Δ Status       │
├────────────────┼──────────────────────┼───────────┼───────┼──────────┼────────────────┤
│ React          │ Trial                │ Trial     │ Trial │ ◉ all    │ ✓ match        │
│ .NET Core      │ Adopt                │ Hold      │ Trial │ ◉ all    │ ▲▲▲ critical   │
│ Docker         │ Adopt                │ Assess    │ Adopt │ ◉ all    │ ▲▲ significant │
│ Serilog        │ Adopt                │ Trial     │   —   │ ◐ partial│ ▲ minor        │
│ Kafka          │ Adopt                │ ⊘ unset   │ Adopt │ ◉ all    │ ⊘ unset        │
│ EF Core        │ Adopt ↳ORM Framework │ Trial     │   —   │ ◐ partial│ ⚠ inconsistent │
│                │ Hold  ↳Data Access   │           │       │          │                │
│ Azure DevOps   │ Trial                │ Hold      │   —   │ ◐ partial│ ✎ accepted     │
│ ◌ Wolverine    │   —                  │   —       │ Adopt │ ◑ unique │ —          ⁉   │
└────────────────┴──────────────────────┴───────────┴───────┴──────────┴────────────────┘
```

**Funktionen:**

- **Sortierung** nach Begriff, Coverage oder Abweichungsgrad.
- **Filter nach Coverage** (`◉` / `◐` / `◑`) und **nach Δ Status** (nur Abweichungen, nur kritische, nur `⚠`, nur `⊘`, nur `✎`). Der Filter greift auf das *sichtbare* Badge, also auf das nach obiger Rangfolge gewonnene.
- **Filter „nur unaufgelöste"** (`◌`) — der direkte Weg von einem verdächtigen Ergebnis in die Zuordnung.
- **Suchfeld** über Begriffe, Aliase und Entry-Herkunft.
- **Farbliche Kodierung der Statuschips** wie im bestehenden Radar: Adopt = grün, Trial = blau, Assess = orange, Hold = grau, Retire = rot.
- **Δ-Badges haben eine eigene Palette**, damit sich `Retire` (roter Statuschip) und `critical` (rotes Δ-Badge) in derselben Zeile unterscheiden lassen.
- **`◌`-Markierung** vor dem Begriff, wenn er nicht im Vokabular aufgelöst ist. Trifft `◌` mit `◑ unique` zusammen, bekommt die Zeile zusätzlich ein `⁉` samt Tooltip „Möglicher Scheinunterschied — Bezeichnung nicht im Vokabular". Dieselbe Markierung trägt die aufgelöste Gegenseite eines möglichen Scheinunterschieds (DE-6). **Bewusst nicht `⚠`:** dasselbe Zeichen steht in derselben Spalte bereits für `⚠ inconsistent`.
- **Entry- und Rohtext-Herkunft** pro Zelle als `↳ <Entry>`, sobald ein Projekt mehr als eine Ausprägung hat, sonst im Tooltip.
- **Klick auf eine Zelle** springt in das Radar des jeweiligen Projekts.

**Δ-Status-Zustände:**

| Badge | Bedingung |
|---|---|
| `✓ match` | Statusdistanz 0 über alle beteiligten Projekte |
| `▲ minor` | Distanz 1 |
| `▲▲ significant` | Distanz 2 |
| `▲▲▲ critical` | Distanz ≥ 3 |
| `⚠ inconsistent` | Mindestens ein Projekt bewertet den Begriff intern uneinheitlich (DE-3) |
| `⊘ unset` | Mindestens ein Projekt hat weder kuratierten noch geerbten Status (DE-7) |
| `✎ accepted` | Abweichung wurde manuell als akzeptiert markiert (§6.2) |
| `—` | Coverage `◑ unique`, kein Vergleich möglich |

**Genau ein Badge pro Zeile.** Die Bedingungen schließen sich nicht gegenseitig aus — ein Begriff kann in Projekt A intern uneinheitlich und in Projekt B unbewertet sein. Damit `Excluded` überschneidungsfrei bleibt (DE-8), gilt eine feste Rangfolge; das erste zutreffende Badge gewinnt:

```
1. —                  Coverage ◑ unique
2. ⚠ inconsistent     DE-3
3. ⊘ unset            DE-7
4. ✎ accepted         Override gesetzt
5. ✓ / ▲ / ▲▲ / ▲▲▲   Statusdistanz nach §6.1
```

Stufe 1 steht ganz oben, weil sie `Excluded ⊆ Compared` erzwingt: Was gar nicht verglichen wird, kann auch nicht vom Vergleich ausgeschlossen werden.

Stufe 2 und 3 stehen über dem Override, obwohl der nach DE-5 nur auf einem vergleichbaren Begriff *gesetzt* werden kann. Kippt eine Zeile später in einen dieser Zustände, ist das ein Datenbefund, den ein akzeptierter Unterschied nicht überdecken darf. Und 2 vor 3, weil zwei widersprüchliche Bewertungen innerhalb eines Projekts der dringendere Befund sind als eine fehlende.

Zusätzlich zutreffende Gründe verschweigt die Zeile nicht — sie stehen im Tooltip der Zelle. Gezählt wird nur einmal.

### 5.4 Section: Radar Overlay

Eine Überlagerung der Radars aller verglichenen Projekte, gefiltert auf die aktive Art-Auswahl. Da Quadranten-Labels und Kategoriezuordnung **pro Projekt** konfiguriert sind, gibt ein wählbares **Referenzprojekt** das Layout vor. Blips, deren Kategorie das Referenzprojekt nicht kennt, landen im Restquadranten „Other".

```
              Arten: alle        Referenzprojekt: [ Alpha ▾ ]

            Languages          ╎          Frameworks
                               ╎
                    ╭──────────┴──────────╮
                ╭───┤                     ├───╮
                │   │   ╭─────────────╮   │   │
          ▲C    │   │   │  ╭───────╮  │   │   │    ●A ■B
                │   │   │  │ ╭───╮ │  │   │   │
     ═══════════╡   │   │  │ │   │ │  │   │   ╞═══════════
                │   │   │  │ ╰───╯ │  │   │   │
          ●A┄┄┄┄┄┄┄┄┄┄┄┄▲C │       │  │   │   │    ■B
                │   │   │  ╰───────╯  │   │   │
                ╰───┤                 ├───╯   │
                    ╰──────────┬──────────╯
            Data Storage       ╎       DevOps & CI/CD

     Ringe von innen nach außen:  Adopt · Trial · Assess · Hold · Retire
     ● Alpha    ■ Beta    ▲ Gamma
     ┄┄┄ Konfliktlinie ab Δ ≥ 2, eingefärbt nach Schweregrad
```

- **Referenzprojekt-Auswahl** oberhalb des Diagramms; Standard ist das erste selektierte Projekt.
- Jedes Projekt bekommt ein eigenes Symbol (●, ■, ▲) und eine eigene Farbe.
- **Konfliktlinien** ab Distanz 2, eingefärbt nach Schweregrad.
- **Hover/Click** zeigt Status aller Projekte, Entry- und Rohtext-Herkunft sowie den Δ-Status.
- **Toggle** pro Projekt zum Ein-/Ausblenden.

**Darstellung der Sonderfälle.** Die vier Zustände sehen bewusst unterschiedlich aus, statt alle „gedämpft" zu sein:

| Zustand | Darstellung |
|---|---|
| `⊘` Blip **ohne Status** | Gemeint ist ein leerer `effectiveStatus`, also weder kuratierter noch geerbter Status (§4.3) — nicht jeder Blip mit leerem `entry.status`. **Nicht geplottet**, es gibt keinen Ring dafür; stattdessen unterhalb des Diagramms als „ohne Status" gelistet, mit Sprung zum Blip. Das ersetzt den bisherigen stillen Hold-Fallback von `statusToRing`, der genau diese Restmenge trifft. |
| `⚠` intern uneinheitlich | Geplottet auf jeder betroffenen Ringposition, die Positionen desselben Projekts sind mit einer durchgezogenen Linie verbunden. Keine projektübergreifende Konfliktlinie. |
| `◌` unaufgelöste Bezeichnung | Normal geplottet, Blip mit gestricheltem Rand. Keine Konfliktlinie, weil die Identität unklar ist. |
| `⬚` Art unbekannt | Normal geplottet, aber blass. Über den Art-Filter gezielt isolierbar. |

---

## 6. Bewertung der Abweichungen — Criticality Model

### 6.1 Automatische Einstufung

```
Adopt (1) → Trial (2) → Assess (3) → Hold (4) → Retire (5)
```

Die **Statusdistanz** zweier Bewertungen ist der Betrag ihrer Differenz. Bei mehr als zwei beteiligten Projekten wird die **maximale Distanz über alle Paarungen** herangezogen.

| Distanz | Einstufung | Farbe | Bedeutung |
|---|---|---|---|
| 0 | **Match** | grün | Projekte sind sich einig. |
| 1 | **Minor** | gelb | Leichte Abweichung, typisch bei unterschiedlichem Reifegrad. |
| 2 | **Significant** | orange | Auffällige Divergenz, sollte besprochen werden. |
| ≥ 3 | **Critical** | rot | Starker Widerspruch, erfordert Klärung (z. B. Adopt ↔ Hold, Trial ↔ Retire). |

Sobald ein beteiligtes Projekt keinen `effectiveStatus` hat (→ `⊘ unset`, DE-7) oder den Begriff intern uneinheitlich bewertet (→ `⚠ inconsistent`, DE-3), wird für den Begriff **gar keine Distanz berechnet**. Er trägt stattdessen das entsprechende Badge und fällt nach DE-8 aus `Comparable`.

Ausdrücklich *nicht* gemeint ist, das betroffene Projekt aus der Paarbildung zu nehmen und aus dem Rest eine Distanz zu bilden — das würde eine Einigkeit ausweisen, die allein durch Weglassen entsteht.

### 6.2 Manuelle Bewertungsüberschreibung

- **„Accepted"** — der Begriff erhält `✎ accepted` und fällt aus `Comparable` heraus (DE-8).
- **Hochstufung auf „Critical"** — bleibt in `Comparable` und zählt als Critical.
- **Kommentar** zur Begründung.

Der Override wird global pro `term.id` gespeichert, ist nur auf aufgelösten **und vergleichbaren** Begriffen möglich und wird bei geändertem Kontext als überprüfungsbedürftig markiert (DE-5). Kippt die Zeile nachträglich auf `⚠ inconsistent` oder `⊘ unset`, überstimmt dieses Badge den Override (§5.3).

---

## 7. Auswirkungen auf bestehende Bereiche

Das Vokabular und der Art-Filter wirken über den Vergleich hinaus. Diese Änderungen gehören zum Feature dazu:

| Bereich | Änderung | Aufwand |
|---|---|---|
| **Questionnaire** (Phase 1) | `getSuggestions()` mischt Vokabularbegriffe der passenden Art unter die Katalog-Beispiele und markiert sie. Freitext bleibt erlaubt. | klein |
| **ProjectSummary** (Phase 2) | Unverändert — die drei Tabs Matrix / Suggestions / Radar bleiben. | keiner |
| **TechRadar — Art-Filter** | `visibleKinds`-Set analog zum vorhandenen `visibleStatuses`, plus drei Filter-Chips. Der für unaufgelöste Blips nötige Rückjoin auf `answerType` existiert im Blip-Viewmodel bereits (§4.3) und ist nicht neu zu bauen. | klein |
| **TechRadar — Blip-Detail** | Neu: Anzeige des aufgelösten Begriffs, Aktionen „zuordnen" und „als eigenen Begriff anlegen" samt Ähnlichkeitsvorschlag (§3.4). Das ist das Vokabular-Werkzeug der Phase 2. | mittel |
| **TechRadar — Status ohne Wert** | Blips ohne `effectiveStatus` landen nicht mehr über den `statusToRing`-Fallback auf dem Hold-Ring, sondern werden unterhalb des Diagramms gelistet (§5.4). Betrifft nur Blips, bei denen auch die Fragebogen-Antwort keinen Status trägt — die bestehende Vererbung `entry.status \|\| answer.status` bleibt unangetastet. | klein |
| **Radar-Konfiguration** | Unverändert — `radarCategoryQuadrants`, `radarQuadrantLabels` und `radarCategoryOrder` bleiben pro Projekt, ohne zweite Dimension. **Keine Migration.** | keiner |
| **Workspace-Store** | Neu: `workspace.vocabulary[]`, Auflösungs- und Alias-Index, Vokabular-Mutationen (anlegen, zusammenführen, umbenennen, Art ändern) sowie `workspace.comparisonOverrides` als Criticality-Override-Speicher (**geschlüsselt über `term.id`**) und `workspace.dismissedSuggestions[]` für verworfene Ähnlichkeitsvorschläge (§5.1). Alle drei Felder liegen bewusst *innerhalb* `workspace`, damit die Passthrough-Argumentation aus §7.1 greift. | groß |
| **TreeNav** | Sektionsüberschrift „Projects" wird zum klickbaren Workspace-Node. | klein |
| **Workspace-Tabs** | Neuer Tab-Typ `workspace-comparison`, plus ein eigenes Persistenzfeld für dessen Offen-Zustand neben `openQuestionnaireIds` / `openProjectSummaryIds` in den Save-Daten (§7.1). | klein |
| **HTML-Export** | `techRadarExport.js` als Vorbild für den Comparison-Export; der Radar-Export selbst bekommt die aktive Art-Auswahl in den Kopf. | mittel |

**Bewusst nicht geändert:** `project.radar[]` behält seine Struktur und sein `(entryId, option)`-Schlüsselpaar, `answers[]` bleibt unangetastet. Beides folgt aus DE-9 und DE-11 und hält das Feature migrationsarm.

**Nicht zu verwechseln:** Der Criticality-Override aus DE-5 ist ein *neues* Konzept des Vergleichs. Der bestehende `setRadarOverride` im Store überschreibt Status und Beschreibung eines einzelnen Blips und bleibt vollständig unangetastet. Es gibt also keine Override-Daten zu migrieren.

### 7.1 Migration und Kompatibilität

Der Entwurf fasst **keine Katalog-, Fragebogen- oder Radar-Struktur** an. Neu sind `workspace.vocabulary[]`, `workspace.comparisonOverrides` und `workspace.dismissedSuggestions[]` — alles additiv **innerhalb** des Workspace-Objekts. Das ist keine Kosmetik, sondern die Voraussetzung des folgenden Arguments: Durchgereicht wird `data.workspace`, nicht die Save-Daten drumherum.

Damit ist **kein Bump von `STORAGE_VERSION` nötig.** Ein fehlendes `vocabulary` kann als idempotente Normalisierung beim Laden ergänzt werden (`if (!Array.isArray(workspace.vocabulary)) workspace.vocabulary = []`), genau dort und genauso, wie `migrateProjectRadar` heute schon versionsunabhängig auf jedem Load läuft. Ein Bump auf v4 würde dagegen dazu führen, dass ältere Builds die Datei wegen `SUPPORTED_STORAGE_VERSIONS` als `unsupported-version` ablehnen — ein vermeidbarer Bruch, denn `applyStoredData` übernimmt den Workspace als Ganzes und reicht unbekannte Felder unverändert durch.

Das Persistenzfeld für den offenen Comparison-Tab liegt dagegen auf Save-Daten-Ebene und wird von `applyStoredData` **nicht** durchgereicht. Ältere Builds lesen es schlicht nicht und verlieren beim nächsten Speichern höchstens den Offen-Zustand eines Tabs, den sie ohnehin nicht darstellen können — kein Datenverlust, der einen Versionsbump rechtfertigen würde.

| Bestandsdaten | Auswirkung |
|---|---|
| Fragenkataloge (eigene wie importierte) | Keine. Weder Schema noch `validateCatalog` werden berührt; `entry.examples` wird nur gelesen. |
| Fragebögen und Antworten | Keine. `answerType` wird ausschließlich gelesen. |
| Radar-Blips und Quadranten-Konfiguration | Keine strukturelle. Sichtbar ändert sich nur die Darstellung von Blips ohne Status (§5.4). |
| Workspaces älterer Versionen (v1/v2) | Keine. Die bestehende Migrationskette bleibt unverändert. |

---

## 8. Export

- **JSON** — maschinenlesbar. Enthält die Art-Auswahl, Projektauswahl, Datenquelle, Vokabular-Abdeckung, alle Kennzahlen aus §5.2, die vollständige Begriffstabelle inklusive Rohtext- und Entry-Herkunft sowie die aktiven Overrides.
- **Standalone HTML** — analog zum bestehenden Radar-HTML-Export (`utils/techRadarExport.js`), mit Summary Card, Matrix und Radar Overlay.

Beide Exporte bilden die **aktive Art-Auswahl** ab und dokumentieren sie im Kopf. Unaufgelöste Bezeichnungen werden im Export als solche gekennzeichnet, damit ein weitergereichter Report seine eigene Unsicherheit mitführt.

---

## 9. User Stories

| # | Story | Akzeptanzkriterium |
|---|---|---|
| 1 | Als Nutzer möchte ich beim Ausfüllen Begriffe vorgeschlagen bekommen, die im Workspace schon etabliert sind. | Die Solution-Combobox zeigt neben den Katalog-Beispielen auch Vokabularbegriffe der passenden Art, sichtbar als solche markiert. |
| 2 | Als Nutzer möchte ich Tools und Practices im Radar getrennt betrachten können. | Das Radar bietet Filter-Chips für `📐 Tools`, `🔷 Practices` und `⬚ Unassigned`; ausgeblendete Arten verschwinden aus dem Diagramm, die Quadranten bleiben unverändert. |
| 3 | Als Nutzer möchte ich beim Kuratieren eines Radar-Eintrags festlegen, welcher Begriff gemeint ist. | Das Blip-Detail zeigt den aufgelösten Begriff oder markiert ihn als `◌`; die Aktionen „zuordnen" und „als eigenen Begriff anlegen" schreiben ins workspace-weite Vokabular. |
| 4 | Als Nutzer möchte ich zwei oder mehr Projekte für einen Vergleich auswählen und die Art eingrenzen. | Checkbox-Liste aller Projekte, standardmäßig alle selektiert; Art-Filter mit `📐 Tools` / `🔷 Practices` / `⬚ Unassigned`, standardmäßig alle aktiv; bei weniger als zwei Selektionen erscheint ein Hinweis. |
| 5 | Als Nutzer möchte ich vor der Auswertung sehen, wie verlässlich der Vergleich ist. | Der Vocabulary-Abschnitt zeigt die Abdeckung je Projekt, beziffert die offenen Bezeichnungen und warnt vor Scheinunterschieden. |
| 6 | Als Nutzer möchte ich unterschiedliche Schreibweisen desselben Begriffs zusammenführen. | Zuordnungsansicht mit Ähnlichkeitsvorschlägen, Aktionen Zuordnen / Eigener Begriff / Später sowie einer gefahrlosen Sammelaktion für exakte Treffer nach Normalisierung. |
| 7 | Als Nutzer möchte ich auf einen Blick sehen, wie stark sich die Projekte unterscheiden. | Summary Card mit Vokabular-, Coverage- und Agreement-Block; die vier Δ-Werte summieren sich sichtbar zu `Comparable`. |
| 8 | Als Nutzer möchte ich die einzelnen Begriffe in einer sortier- und filterbaren Tabelle sehen. | Comparison Matrix mit je einer Zeile pro Begriff, getrennten Coverage- und Δ-Spalten, Filtern über beide Dimensionen sowie über unaufgelöste Bezeichnungen. |
| 9 | Als Nutzer möchte ich erkennen, welche Begriffe *nicht* vergleichbar sind und warum. | `⊘ unset`, `⚠ inconsistent`, `✎ accepted` und `◌` sind in der Matrix sichtbar und in der Summary Card beziffert; jede Zeile trägt genau ein Δ-Badge nach der Rangfolge aus §5.3, weitere zutreffende Gründe nennt der Tooltip. |
| 10 | Als Nutzer möchte ich die Radars visuell überlagern. | Radar Overlay mit eigenem Symbol und eigener Farbe pro Projekt, Quadranten vom wählbaren Referenzprojekt, Konfliktlinien ab Δ ≥ 2. |
| 11 | Als Nutzer möchte ich die automatische Einstufung überschreiben und kommentieren. | Override pro Begriff mit Kommentarfeld, global über `term.id` persistiert, bei geändertem Kontext als überprüfungsbedürftig markiert. |
| 12 | Als Nutzer möchte ich den Vergleichsreport exportieren. | Export als JSON oder HTML mit Art-Auswahl, Projektauswahl, Datenquelle, Kennzahlen und Kennzeichnung unaufgelöster Bezeichnungen. |

---

## 10. Interaktionsskizze

### 10.1 TreeNav mit Workspace-Node

```
┌──────────────────────────┐
│ Question Catalogs    [+] │
│  📄 Standard Catalog     │
│  📄 Interview Catalog    │
├──────────────────────────┤
│ 📦 Workspace    3 proj.  │  ← Klick öffnet Comparison-Tab
│  📁 Project Alpha        │  ← Klick öffnet Project-Summary-Tab
│    📄 Questionnaire 1    │
│    📄 Questionnaire 2    │
│  📁 Project Beta         │
│    📄 Questionnaire 3    │
│  📁 Project Gamma        │
│    📄 Questionnaire 4    │
└──────────────────────────┘
```

### 10.2 Comparison-Tab (Hauptbereich)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 📦 Workspace Comparison                                       [Export ▾]  │
│                                                                            │
│ ┌─ Projects ──────────────────────────────── Data: [Radar ▾] ──────────┐ │
│ │  ☑ Project Alpha   ☑ Project Beta   ☑ Project Gamma      3 selected    │ │
│ │  Kind:  ☑ 📐 Tools    ☑ 🔷 Practices    ☑ ⬚ Unassigned                 │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌─ Vocabulary ──────────────────────────────────────────────── ▾ ───────┐ │
│ │  Alpha 100 %  │  Beta 82 % (4)  │  Gamma 61 % (9)                     │ │
│ │  ⚠ 13 unaufgelöst        [Alle exakten Treffer (5)]  [Zuordnen…]     │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌─ Summary ───────────────────────────────────────────────────── ▾ ─────┐ │
│ │  Vokabular 82 %  ◌13     │ Total 38 │ ◉24 · ◐8 · ◑6 │ Coverage 63 %  │ │
│ │  Compared 32 − Excluded 5 (⊘2 ⚠1 ✎2) = Comparable 27                 │ │
│ │  ✓20  ▲4  ▲▲2  ▲▲▲1      │ Agreement 74 %  moderate                  │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌─ Comparison Matrix ─ Coverage:[All ▾] Δ:[All ▾] [🔍] ────────── ▾ ────┐ │
│ │ ┌──────────────┬───────┬───────┬───────┬──────────┬──────────────┐     │ │
│ │ │ Term         │ Alpha │ Beta  │ Gamma │ Coverage │ Δ Status     │     │ │
│ │ ├──────────────┼───────┼───────┼───────┼──────────┼──────────────┤     │ │
│ │ │ .NET Core    │ Adopt │ Hold  │ Trial │ ◉ all    │ ▲▲▲ critical │     │ │
│ │ │ React        │ Trial │ Trial │ Trial │ ◉ all    │ ✓ match      │     │ │
│ │ │ Serilog      │ Adopt │ Trial │   —   │ ◐ partial│ ▲ minor      │     │ │
│ │ │ ◌ Wolverine  │   —   │   —   │ Adopt │ ◑ unique │ —         ⁉  │     │ │
│ │ └──────────────┴───────┴───────┴───────┴──────────┴──────────────┘     │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌─ Radar Overlay ─ Reference:[Alpha ▾] [☑A] [☑B] [☑C] ────────── ▾ ─────┐ │
│ │                    (radar SVG mit farblich codierten Blips)            │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Begriffsglossar

| Begriff | Definition |
|---|---|
| **Term / Begriff** | Ein Eintrag im Workspace-Vokabular mit stabiler `id`, kanonischem `name`, `kind` und Aliasliste. Der Vergleichsschlüssel. |
| **Alias** | Eine normalisierte Schreibweise, die auf einen Begriff zeigt. Gehört zu höchstens einem Begriff. |
| **Unaufgelöst (`◌`)** | Eine Bezeichnung, für die es keinen Begriff gibt. Wird mit Rohtext verglichen und als unsicher markiert. |
| **Vokabular-Abdeckung** | Anteil aufgelöster eindeutiger Bezeichnungen an allen eindeutigen Bezeichnungen eines Projekts. Unabhängig vom Art-Filter. |
| **Kind / Art** | `📐 tool`, `🔷 practice` oder `⬚ unassigned`. Ergibt sich aus `kind` des Begriffs, ersatzweise aus `answerType`. Steuert einen Sichtbarkeitsfilter, keine getrennte Ansicht — alle Kennzahlen außer der Vokabular-Abdeckung rechnen sich auf die aktive Auswahl neu. |
| **`◌` gegen `⬚`** | `◌` = Bezeichnung nicht im Vokabular aufgelöst (Identität unklar). `⬚` = Art unbekannt. Unabhängige Zustände, die zusammen auftreten können. |
| **Blip** | Ein Eintrag in `project.radar[]`, eindeutig über `(entryId, option)`. Mehrere Blips können auf denselben Begriff auflösen. |
| **Vergleichseinheit** | Der Datensatz, aus dem eine Matrixzelle gespeist wird: im Radar-Modus ein Blip, im All-answers-Modus eine Fragebogen-Antwort (§4.3). Trägt Rohname, Status und Art. |
| **Entry** | Ein Aspekt im Fragenkatalog (z. B. „ORM Framework"). Dient nur als Herkunftsanzeige, nicht als Schlüssel. |
| **Status** | Bewertung auf der Radar-Skala: Adopt, Trial, Assess, Hold, Retire. Maßgeblich ist der `effectiveStatus` — der kuratierte Status, ersatzweise der der Fragebogen-Antwort (§4.3). |
| **Coverage** | In wie vielen selektierten Projekten ein Begriff vorkommt: `◉ all`, `◐ partial` (≥ 2, < alle), `◑ unique` (genau 1). Ausschließlich diese Klassifikation — der Prozentwert in der Summary Card heißt „Anteil ◉ all". |
| **Statusdistanz** | Betrag der Differenz zweier Stufen auf der fünfstufigen Skala; bei 3+ Projekten das Maximum über alle Paarungen. |
| **Δ Status** | Vergleichsergebnis eines Begriffs: `✓ match`, `▲ minor`, `▲▲ significant`, `▲▲▲ critical`, `⚠ inconsistent`, `⊘ unset`, `✎ accepted` oder `—`. Genau eines pro Begriff, nach der Rangfolge in §5.3. |
| **Compared** | Begriffe mit Coverage `◉ all` oder `◐ partial`. |
| **Excluded** | `Compared`-Begriffe, die aus der Divergenzstatistik fallen: `⊘ unset`, `⚠ inconsistent`, `✎ accepted`. Nie ein `◑ unique`-Begriff und nie in zwei Gründen gleichzeitig (DE-8, §5.3). |
| **Comparable** | `Compared − Excluded`. Bezugsgröße aller Quoten. |
| **Agreement** | `Matches / Comparable × 100`. ≥ 85 % *high*, 65–84 % *moderate*, < 65 % *low*. Datenquellenneutral benannt (§5.2). |
| **Scheinunterschied (`⁉`)** | Eine Divergenz oder ein `◑ unique`, das allein aus unterschiedlichen Schreibweisen entsteht. In der Matrix mit `⁉` markiert — nicht mit `⚠`, das in derselben Spalte `inconsistent` bedeutet. Das Vokabular existiert, um genau das zu verhindern. |
| **Criticality Override** | Manuelle Neubewertung einer Abweichung, global pro `term.id`, mit protokolliertem Kontext. |
| **Referenzprojekt** | Das Projekt, dessen Quadranten-Layout das Radar Overlay vorgibt. |
| **Workspace-Node** | Klickbarer Eintrag in der TreeNav, der die bisherige Überschrift „Projects" ersetzt und den Comparison-Tab öffnet. |
