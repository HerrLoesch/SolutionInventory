# KI-gestützte Fragenkataloge: Schema, Import & Validierung

Kurzanleitung, um **Fragenkataloge (Catalogs) von einer KI erstellen** zu lassen und in ein
Projekt zu importieren – inklusive Validierung gegen den projekteigenen Katalog.

## Überblick

Ein *Catalog* ist eine wiederverwendbare Vorlage (Struktur ohne Antworten). Ein *Questionnaire*
ist eine ausgefüllte Instanz eines Catalogs. Der KI-Workflow besteht aus drei Schritten:

1. **Schema an die KI geben** → 2. **KI erzeugt Katalog-JSON** → 3. **Import + Validierung ins Projekt**

## 1. KI-Schema kopieren

In der Seitenleiste im Abschnitt **Question Catalogs** gibt es das Roboter-Symbol
(*AI schema for catalog authoring*):

- **Copy to clipboard** – kopiert das komplette Autoren-Paket in die Zwischenablage.
- **Download as .md** – speichert es als `question-catalog-ai-schema.md`.

Das Paket ist selbsterklärend und enthält alles, was eine KI braucht:

- **Autoren-Regeln** in Klartext (u. a. genau **eine** Metadaten-Kategorie, Kategorie-`id`
  nach `^[a-z0-9-]+$`, eindeutige Entry-`id`s, Beispiele mit `type: "practice" | "tool"`),
- das **JSON-Schema** ([catalog.schema.json](../Client/src/schema/catalog.schema.json)),
- ein **vollständiges, valides Beispiel**.

Dieses Paket einfach an die KI weiterreichen mit der Bitte, **nur** das JSON-Objekt
zurückzugeben.

## 2. Katalog importieren

Im **⋮-Menü eines Projekts** → **Import catalog (AI)**. Im Dialog:

- KI-Ergebnis **einfügen** (Textfeld) **oder** eine `.json`-Datei wählen.
- Direkt im Dialog gibt es erneut **Copy AI schema** als Abkürzung.

Der importierte Katalog wird der **globalen Bibliothek** hinzugefügt (mit frischer id) und als
**Default-Katalog des Projekts** gesetzt. Bereits bestehende Questionnaires bleiben unverändert –
nur **neue** Questionnaires nutzen den neuen Katalog.

## 3. Validierung

Der Dialog zeigt zwei Ebenen der Prüfung:

- **Schema-Validierung** (blockierend): fehlende Pflichtfelder, doppelte/ungültige ids, falsche
  Anzahl Metadaten-Kategorien usw. Solange **Fehler** bestehen, ist *Import* deaktiviert.
  Warnungen (z. B. `appliesTo` verweist auf ein unbekanntes Metadatenfeld) blockieren nicht.
- **Vergleichsbericht gegen den Projektkatalog** (nur informativ): zeigt hinzugefügte, entfernte
  und geänderte Kategorien und Fragen sowie Abweichungen im Metadaten-Vokabular. Diese
  Abweichungen **blockieren den Import nicht** – sie helfen einzuschätzen, wie stark das
  KI-Ergebnis vom bisherigen Katalog abweicht.

## Beteiligte Dateien

- Schema-Paket: [catalogAiSchema.js](../Client/src/schema/catalogAiSchema.js)
- Parsen/Aufbereiten: [catalogImport.js](../Client/src/services/catalogImport.js)
- Vergleich: [catalogCompare.js](../Client/src/services/catalogCompare.js)
- Validator: [catalogValidation.js](../Client/src/schema/catalogValidation.js)
- Dialog: [CatalogImportDialog.vue](../Client/src/components/catalog/CatalogImportDialog.vue)
- Store: `importCatalogToProject` / `getProjectDefaultCatalog` in
  [workspaceStore.js](../Client/src/stores/workspaceStore.js)
