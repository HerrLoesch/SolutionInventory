# Design: Projektvergleich (Project Comparison)

## 1. Motivation

Innerhalb eines Workspaces existieren häufig mehrere Projekte, die jeweils eigene Fragebögen, Technologiebewertungen und ein Tech Radar besitzen. Aktuell fehlt die Möglichkeit, zwei oder mehr Projekte direkt nebeneinander zu vergleichen. Genau das wird immer dann gebraucht, wenn Entscheidungen über Technologie-Standardisierung, Konsolidierung oder Migration anstehen:

- **Architektur-Reviews** — Wie unterscheiden sich die Technologie-Stacks zweier Services?
- **Governance & Standardisierung** — Welche Projekte weichen von der bevorzugten Bewertung ab?
- **Risikobewertung** — Wo gibt es kritische Diskrepanzen (z. B. ein Projekt nutzt eine Technologie auf „Adopt", ein anderes bewertet sie mit „Hold")?
- **Portfolioüberblick** — Wie groß ist die technologische Diversität über alle Projekte hinweg?

## 2. Übersicht des Features

Der Projektvergleich wird über einen **Workspace-Node** in der TreeNav ausgelöst — analog dazu, wie ein Klick auf ein Projekt dessen Fragebogenvergleich (Matrix / Suggestions / Radar) öffnet.

### 2.1 Navigation: Workspace-Node in der TreeNav

Die bestehende Projekt-Liste erhält einen übergeordneten, klickbaren Eintrag:

```
TreeNav (linke Sidebar)
──────────────────────────
Question Catalogs
  📄 Standard Catalog
  📄 Interview Catalog
──────────────────────────
📦 Workspace                  ← NEU: klickbar
  📁 Project Alpha            ← wie bisher
    📄 Questionnaire 1
    📄 Questionnaire 2
  📁 Project Beta
    📄 Questionnaire 3
  📁 Project Gamma
    📄 Questionnaire 4
```

- **Icon**: `mdi-briefcase-outline` (oder `mdi-folder-network-outline`), visuell abgesetzt von den Projekt-Ordnern.
- **Label**: Zeigt den Workspace-Namen plus Chip „3 projects".
- **Klick** auf den Workspace-Node öffnet einen neuen Tab-Typ `workspace-comparison` im Hauptbereich — gleiches Muster wie `project-summary` für einzelne Projekte.

### 2.2 Projektauswahl im Comparison-Tab

Im geöffneten Comparison-Tab sind **standardmäßig alle Projekte selektiert**, sodass sofort ein Gesamtvergleich sichtbar wird. Der Nutzer kann einzelne Projekte über Checkboxen abwählen, um den Vergleich einzugrenzen. Bei weniger als zwei selektierten Projekten wird ein Hinweis angezeigt.

```
┌─────────────────────────────────────────────────────────────┐
│ 📦 Workspace Comparison                        [Export ▾]  │
├─────────────────────────────────────────────────────────────┤
│ Projects:  ☑ Alpha   ☑ Beta   ☑ Gamma        3 selected    │
│                                                             │
│  (Vergleichsansicht erscheint sofort, kein extra Button)    │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Datenquelle: Radar-First mit Fragebogen-Fallback

Die Vergleichsdaten stammen primär aus den **kuratierten Tech-Radar-Blips** der Projekte. Das Radar bildet die bewusst getroffene, konsolidierte Einschätzung ab und liefert einen fokussierten Vergleich ohne Rauschen.

Ein Toggle **„Include all questionnaire answers"** schaltet auf den vollständigen Fragebogen-Datensatz um, falls eine breitere Abdeckung gewünscht ist (auf Kosten der Übersichtlichkeit).

| Modus | Datenquelle | Umfang |
|---|---|---|
| **Radar** (Standard) | `project.radar[]` — Blips mit Entry-ID, Technologie, Status (ggf. Override) | Nur explizit kuratierte Einträge |
| **All Answers** (Toggle) | Alle Antworten aus allen Fragebögen aller selektierten Projekte | Vollständig, aber potentiell viel Rauschen |

Nach der Projektauswahl erscheint die Vergleichsansicht mit drei Abschnitten (Sections), die jeweils ein- und ausklappbar sind.

## 2.4 Offene Design-Entscheidungen (resolved)

Die folgenden Punkte wurden bei der Konsistenzprüfung identifiziert. Die gewählte Lösung ist jeweils markiert — bitte prüfen und ggf. ändern.

#### DE-1: Vergleichsgranularität — Entry vs. Technologie

> **Entscheidung: Technologiezentriert, radar-basiert.**

Der Vergleich findet auf Ebene der konkreten Technologie statt — identifiziert über den **Technologienamen** im Radar-Blip. Entry-IDs und Kategorien/Quadranten sind für das Matching irrelevant, da verschiedene Projekte verschiedene Fragenkataloge nutzen können und dieselbe Technologie in unterschiedlichen Kategorien führen können. Was zählt ist: *Haben beide Projekte „EF Core" im Radar, und wenn ja, auf welchem Ring?*

#### DE-2: Matching-Strategie über Projekte

> **Entscheidung: Matching rein über den Technologienamen.**

Zwei Radar-Blips werden als „gleiche Technologie" gewertet, wenn der **Technologiename** übereinstimmt (case-insensitiv, getrimmt). Entry-ID und Kategorie/Quadrant fließen nicht ins Matching ein — der Vergleich ist vollständig katalog- und kategorieunabhängig. Das entspricht dem Wesen des Tech Radars als konsolidierte, katalogübergreifende Bewertung.

Beispiel: Projekt Alpha hat „EF Core [Adopt]" in Quadrant „Frameworks", Projekt Beta hat „EF Core [Hold]" in Quadrant „Data Access" → Treffer, Statusdistanz = 3 (Critical).

*Fuzzy-Matching (z. B. „Entity Framework Core" ↔ „EF Core") ist ein mögliches Folgefeature, aber nicht Teil des MVP.*

#### DE-3: Widersprüchliche Antworten innerhalb eines Projekts

> **Entscheidung: Im Standard-Modus (Radar) nicht relevant. Im All-Answers-Fallback alle einzeln zeigen.**

Im Radar-Modus tritt dieses Problem nicht auf — das Radar ist bereits die kuratierte, konsolidierte Bewertung pro Projekt. Es gibt pro Technologie genau einen Blip mit einem definierten Status.

Nur im optionalen „All Answers"-Fallback kann es vorkommen, dass ein Projekt in verschiedenen Fragebögen widersprüchliche Status für dieselbe Technologie hat. In diesem Fall werden alle Antworten mit Fragebogen-Herkunft angezeigt und interne Widersprüche visuell hervorgehoben (⚠-Marker).

#### DE-4: Projekte ohne Radar-Blips

> **Entscheidung: Hinweis + Auto-Fallback.**

Wenn im Radar-Modus mindestens ein selektiertes Projekt keine Radar-Blips hat, wird ein Info-Banner angezeigt (z. B. *„Project Gamma has no Tech Radar entries. Showing all questionnaire answers instead."*) und automatisch auf den „All Answers"-Modus umgeschaltet. Der Nutzer kann danach manuell zurück zum Radar-Modus wechseln (dann werden Projekte ohne Radar effektiv leer dargestellt).

#### DE-5: Criticality-Override-Persistierung

> **Entscheidung: Pro Technologiename global.**

Ein manueller Override (z. B. „EF Core Abweichung = Accepted") wird am Schlüssel `technologyName` (normalisiert: lowercase, trimmed) gespeichert und gilt workspace-weit, unabhängig davon welche Projekte gerade verglichen werden oder in welchem Katalog/Quadranten die Technologie liegt. Bei bestehenden Overrides zeigt die UI einen dezenten Hinweis „manually set".

#### DE-6: „Unique" bei 3+ Projekten

> **Entscheidung: Zwei Stufen — unique und partial.**

| Vorkommen | Δ-Label | Bedeutung |
|---|---|---|
| Alle Projekte, gleicher Status | `✓ match` | Vollständige Übereinstimmung |
| Alle Projekte, verschiedener Status | `▲ diff` / `▲▲ crit` | Divergenz (Schwere nach Distanz) |
| Manche Projekte (≥ 2, < alle) | `◐ partial` | Nicht flächendeckend eingesetzt |
| Genau 1 Projekt | `◑ unique` | Nur in diesem einen Projekt vorhanden |

In der Summary Card wird neben „Shared" und „Divergent" auch die Anzahl der **Partial**- und **Unique**-Einträge ausgewiesen.

---

## 3. Vergleichsansicht — Aufbau

### 3.1 Section: Summary Card

Eine kompakte Übersichtskarte zeigt die wichtigsten Kennzahlen auf einen Blick:

```
┌──────────────────────────────────────────────────────────────┐
│  Comparison Summary                          2 projects      │
├────────────────┬──────────────────┬──────────────────────────┤
│  Shared        │  Divergent       │  Deviation Score         │
│  Technologies  │  Technologies    │                          │
│     24         │      7           │    18 %                  │
│                │  (3 critical)    │  ████░░░░░░░░  low       │
├────────────────┴──────────────────┴──────────────────────────┤
│  Radar Agreement  82 %  │  Unique to Alpha: 4  │  Unique to Beta: 2  │
└──────────────────────────────────────────────────────────────┘
```

**Enthaltene Metriken:**

| Kennzahl | Berechnung |
|---|---|
| **Shared Technologies** | Anzahl der Technologien/Practices, die in allen verglichenen Projekten vorkommen (identischer Entry-ID-Match über alle Fragebögen). |
| **Divergent Technologies** | Shared Technologies, bei denen sich der **Status** (Adopt/Trial/Assess/Hold/Retire) zwischen den Projekten unterscheidet. |
| **Critical Divergences** | Teilmenge der Divergent Technologies, bei denen die Statusabweichung ≥ 2 Ringstufen beträgt (z. B. Adopt ↔ Hold, Trial ↔ Retire). |
| **Deviation Score** | `Divergent / Shared × 100` — prozentualer Anteil der Abweichungen an den Gemeinsamkeiten. Kategorisierung: ≤ 15 % = *low*, 16–35 % = *moderate*, > 35 % = *high*. |
| **Radar Agreement** | Anteil der gemeinsamen Tech-Radar-Einträge, die denselben Ring (Status) haben. |
| **Unique to …** | Technologien, die nur in genau einem Projekt auftauchen. |

### 3.2 Section: Technology & Pattern Comparison Matrix

Eine Tabelle, die pro Eintrag (Entry) aus dem Fragenkatalog die Antworten aller verglichenen Projekte nebeneinanderstellt — ähnlich der bestehenden ProjectMatrix, aber quer über Projekte statt quer über Fragebögen.

```
┌──────────────────┬──────────────────────┬──────────────────────┬──────────┐
│ Entry            │ Project Alpha        │ Project Beta         │ Δ Status │
├──────────────────┼──────────────────────┼──────────────────────┼──────────┤
│ ORM Framework    │ EF Core  [Adopt]     │ Dapper  [Trial]      │          │
│                  │                      │ EF Core [Hold]  ⚠    │ ▲▲ crit  │
├──────────────────┼──────────────────────┼──────────────────────┼──────────┤
│ CI/CD Pipeline   │ GitHub Actions [Adopt]│ GitHub Actions [Adopt]│ ✓ match │
├──────────────────┼──────────────────────┼──────────────────────┼──────────┤
│ Message Broker   │ RabbitMQ [Trial]     │ —                    │ unique   │
└──────────────────┴──────────────────────┴──────────────────────┴──────────┘
```

**Funktionen:**

- **Sortierung** nach Kategorie, Entry-Name oder Abweichungsgrad.
- **Filter** nach Abweichungsart: „Nur Abweichungen", „Nur Gemeinsamkeiten", „Nur kritische Abweichungen", „Nur Unique".
- **Filter nach Typ** (Tool / Practice) — analog zur bestehenden Matrix.
- **Suchfeld** über alle Entries und Technologienamen.
- **Farbliche Kodierung** der Statuschips wie im bestehenden Tech Radar (Adopt = grün, Trial = blau, Assess = orange, Hold = grau, Retire = rot).
- **Δ Status-Spalte** zeigt kompakt das Vergleichsergebnis:
  - `✓ match` — identischer Status in allen Projekten.
  - `▲ diff` — Abweichung um 1 Ringstufe (informativ).
  - `▲▲ crit` — Abweichung um ≥ 2 Ringstufen (kritisch, rot hervorgehoben).
  - `unique` — Eintrag existiert nur in einem Projekt.

### 3.3 Section: Radar Overlay

Eine visuelle Überlagerung der Tech Radars aller verglichenen Projekte auf einem gemeinsamen Radar-Diagramm.

```
           ┌──────────────────────────────┐
           │         Adopt                │
           │       ●A ●B                  │
           │    ─────────────             │
           │      Trial                   │
           │    ●A        ●B ← conflict   │
           │  ────────────────            │
           │      Assess                  │
           │         ●B                   │
           │  ────────────────            │
           │      Hold                    │
           │    ●A                        │
           └──────────────────────────────┘

           ●A = Project Alpha   ●B = Project Beta
```

**Funktionen:**

- Jedes Projekt bekommt eine eigene Blip-Farbe bzw. ein Symbol (●, ▲, ■), damit Überlappungen erkennbar sind.
- **Konflikt-Hervorhebung**: Wenn dieselbe Technologie in verschiedenen Ringen liegt, wird eine gestrichelte Verbindungslinie zwischen den Blips gezeichnet, eingefärbt nach Schweregrad.
- **Hover/Click** auf einen Blip zeigt ein Detail-Popup mit dem Status beider Projekte und der Abweichung.
- **Toggle** pro Projekt, um einzelne Radars ein-/auszublenden.

## 4. Bewertung der Abweichungen — Criticality Model

Nicht jede Abweichung ist gleich problematisch. Das Criticality Model ordnet jeder Differenz eine Stufe zu:

### 4.1 Automatische Einstufung

Die Status-Reihenfolge bildet eine ordinale Skala mit fünf Stufen:

```
Adopt (1) → Trial (2) → Assess (3) → Hold (4) → Retire (5)
```

Die **Statusdistanz** zweier Bewertungen ist `|Stufe_A − Stufe_B|`.

| Distanz | Einstufung | Farbe | Bedeutung |
|---|---|---|---|
| 0 | **Match** | grün | Projekte sind sich einig. |
| 1 | **Minor** | gelb | Leichte Abweichung, typisch bei unterschiedlichem Reifegrad. |
| 2 | **Significant** | orange | Auffällige Divergenz, sollte besprochen werden. |
| ≥ 3 | **Critical** | rot | Starker Widerspruch, erfordert Klärung (z. B. Adopt vs. Hold/Retire). |

Bei **mehr als zwei Projekten** wird die maximale Distanz über alle Paarungen herangezogen.

### 4.2 Manuelle Bewertungsüberschreibung

Der Nutzer kann die automatische Einstufung pro Eintrag manuell überschreiben, z. B.:

- Eine Abweichung als **„Accepted / Expected"** markieren (wird grün, zählt nicht mehr als Abweichung in der Statistik).
- Eine eigentlich kleine Abweichung als **„Critical"** hochstufen (z. B. wegen regulatorischer Vorgaben).
- Einen **Kommentar** hinterlegen, der die Bewertung begründet.

Diese Überschreibungen werden im Workspace gespeichert und bleiben bei erneuten Vergleichen erhalten.

## 5. Zahlenmäßige Auswertung — Comparison Report

Unterhalb der Comparison Matrix wird ein zusammenfassender Report-Bereich angezeigt:

### 5.1 Kennzahlen-Dashboard

| Metrik | Wert (Beispiel) | Beschreibung |
|---|---|---|
| **Total Entries** | 38 | Gesamtzahl aller betrachteten Entries (Vereinigung). |
| **Shared Entries** | 31 | Entries, die in allen Projekten vorkommen. |
| **Coverage** | 82 % | `Shared / Total × 100` — wie vollständig ist die Überlappung? |
| **Matches** | 24 / 31 | Shared Entries mit identischem Status. |
| **Minor Deviations** | 4 | Distanz = 1. |
| **Significant Deviations** | 2 | Distanz = 2. |
| **Critical Deviations** | 1 | Distanz ≥ 3. |
| **Deviation Score** | 23 % | `(Divergent / Shared) × 100`. |
| **Radar Agreement** | 77 % | `(Matches / Shared) × 100`. |
| **Unique Entries** | 7 | Nur in einem Projekt vorhanden. |

### 5.2 Aufschlüsselung nach Kategorie

Dieselben Metriken werden pro Fragenkatalog-Kategorie aufgeschlüsselt dargestellt, um zu sehen, *wo* die Abweichungen liegen:

```
┌────────────────────────┬────────┬──────────┬───────────┬───────────┐
│ Category               │ Shared │ Matches  │ Divergent │ Critical  │
├────────────────────────┼────────┼──────────┼───────────┼───────────┤
│ Programming Languages  │    5   │    4     │     1     │     0     │
│ Frameworks             │    8   │    5     │     3     │     1     │
│ Data Storage           │    4   │    4     │     0     │     0     │
│ DevOps & CI/CD         │    6   │    4     │     2     │     0     │
│ Security Practices     │    3   │    2     │     1     │     1     │
└────────────────────────┴────────┴──────────┴───────────┴───────────┘
```

### 5.3 Export

Der Vergleichsreport kann exportiert werden:

- **JSON** — maschinenlesbar für weitere Auswertungen.
- **Standalone HTML** — analog zum bestehenden Tech-Radar-HTML-Export, als teilbare Einzeldatei.

## 6. User Stories

| # | Story | Akzeptanzkriterium |
|---|---|---|
| 1 | Als Nutzer möchte ich zwei oder mehr Projekte für einen Vergleich auswählen können. | Multi-Select-Dropdown oder Checkbox-Liste mit allen Projekten im Workspace; mindestens zwei müssen gewählt werden. |
| 2 | Als Nutzer möchte ich auf einen Blick sehen, wie viele Technologien geteilt werden und wie hoch die Abweichung ist. | Summary Card mit Shared, Divergent, Critical und Deviation Score wird sofort nach Auswahl angezeigt. |
| 3 | Als Nutzer möchte ich die einzelnen Abweichungen in einer sortierbaren Tabelle sehen. | Comparison Matrix mit Δ-Status-Spalte, filterbar nach Match/Minor/Significant/Critical/Unique. |
| 4 | Als Nutzer möchte ich die Tech Radars visuell überlagern. | Radar Overlay zeigt Blips aller Projekte mit farblicher Unterscheidung und Verbindungslinien bei Konflikten. |
| 5 | Als Nutzer möchte ich eine automatische Einstufung der Kritikalität jeder Abweichung erhalten. | Distanzbasierte Einstufung (Match/Minor/Significant/Critical) wird automatisch berechnet und angezeigt. |
| 6 | Als Nutzer möchte ich die automatische Einstufung manuell überschreiben und kommentieren können. | Override-Option pro Eintrag mit Kommentarfeld; Override wird persistiert und bei erneutem Vergleich wiederhergestellt. |
| 7 | Als Nutzer möchte ich die Abweichungen nach Kategorie aufgeschlüsselt sehen. | Kategorie-Tabelle unterhalb der Summary Card mit Shared/Matches/Divergent/Critical pro Kategorie. |
| 8 | Als Nutzer möchte ich den Vergleichsreport als JSON oder HTML exportieren können. | Export-Buttons generieren eine Datei mit allen Kennzahlen und der vollständigen Detailtabelle. |

## 7. Interaktionsskizze

### 7.1 TreeNav mit Workspace-Node

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

### 7.2 Comparison-Tab (Hauptbereich)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📦 Workspace Comparison                                    [Export ▾]  │
│                                                                         │
│ ┌─ Projects ───────────────────────────────── Data: [Radar ▾] ────────┐ │
│ │  ☑ Project Alpha    ☑ Project Beta    ☑ Project Gamma   3 selected  │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─ Summary ──────────────────────────────────────────────── ▾ ────────┐ │
│ │  Shared: 31  │  Divergent: 7 (1 crit)  │  Score: 23% moderate      │ │
│ │  Radar Agreement: 77%  │  Unique: Alpha 4 / Beta 2 / Gamma 1      │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─ Comparison Matrix ──── Filter: [All ▾] [🔍 Search] ─── ▾ ────────┐ │
│ │  ┌──────────────┬──────────┬──────────┬──────────┬──────┐           │ │
│ │  │ Entry        │ Alpha    │ Beta     │ Gamma    │  Δ   │           │ │
│ │  ├──────────────┼──────────┼──────────┼──────────┼──────┤           │ │
│ │  │ EF Core      │ Adopt    │ Hold  ⚠  │ Trial    │▲▲crit│           │ │
│ │  │ React        │ Trial    │ Trial    │ Trial    │ ✓    │           │ │
│ │  │ RabbitMQ     │ Adopt    │ —        │ —        │ uniq │           │ │
│ │  └──────────────┴──────────┴──────────┴──────────┴──────┘           │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─ Radar Overlay ──── [☑ Alpha] [☑ Beta] [☑ Gamma] ────── ▾ ────────┐ │
│ │                      (radar SVG mit farblich codierten Blips)        │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─ Category Breakdown ─────────────────────────────────── ▾ ────────┐ │
│ │  Frameworks:    5 shared, 3 divergent (1 crit)                     │ │
│ │  DevOps:        6 shared, 2 divergent (0 crit)                     │ │
│ │  Security:      3 shared, 1 divergent (1 crit)                     │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## 8. Begriffsglossar

| Begriff | Definition |
|---|---|
| **Entry** | Ein einzelner Aspekt im Fragenkatalog (z. B. „ORM Framework", „Logging Library"). Identifiziert über seine `id`. |
| **Answer/Technology** | Eine konkrete Technologie oder Praxis, die als Antwort zu einem Entry angegeben wurde (z. B. „EF Core", „Serilog"). |
| **Status** | Die Bewertung einer Technologie auf der Radar-Skala: Adopt, Trial, Assess, Hold, Retire. |
| **Shared Entry** | Ein Entry, der in allen verglichenen Projekten mindestens eine Antwort hat. |
| **Divergent Entry** | Ein Shared Entry, bei dem mindestens eine gemeinsame Technologie unterschiedliche Status-Bewertungen hat. |
| **Deviation Score** | Prozentualer Anteil divergenter Entries an der Gesamtzahl geteilter Entries. |
| **Radar Agreement** | Prozentualer Anteil der gemeinsamen Radar-Blips mit identischem Ring/Status. |
| **Criticality Override** | Manuelle Neubewertung der automatisch berechneten Abweichungsstufe durch den Nutzer. |
| **Workspace-Node** | Übergeordneter, klickbarer Eintrag in der TreeNav oberhalb der Projektliste. Öffnet den Comparison-Tab. |
