# Tech Radar – Custom HTML Export: Einbetten & Bearbeiten

Kurzanleitung für den **Custom HTML Export** des Tech Radars: wie man die erzeugte
Seite in ein Wiki/Intranet einbettet und – im JSON-Modus – die Daten direkt im HTML
pflegt, ohne die App zu öffnen.

> Geöffnet wird der Export über das **⋮-Menü** in der Tech-Radar-Toolbar →
> **Custom HTML Export**. Die erzeugte Datei ist immer **eigenständig**: CSS ist
> inline, es gibt keine externen Requests (keine CDN, keine Web-Fonts, keine Bilder).

## Einstellungen werden im Projekt gespeichert

Alles, was der Dialog kann – Export-Modus, Spaltenzahl, Labels, Status-Farben und
-Namen, welche Status eingeschlossen sind, Kategorie-Gruppierung/-Reihenfolge,
Umschalter, Bindungsgrad, Blip-Nummern – wird **beim Projekt gespeichert** und beim
nächsten Öffnen des Dialogs wiederhergestellt. Kommen später neue Kategorien dazu,
werden sie automatisch als eigene Gruppe ergänzt; verschwundene Kategorien fallen raus.
Mit **Reset to defaults** setzt man die gespeicherten Einstellungen zurück.

## Die zwei Modi – welchen wählen?

| | **Static (no JS)** | **JSON + JS** |
|---|---|---|
| Inhalt | fertig gerendertes HTML | JSON-Liste + kleiner Inline-Renderer |
| Braucht JavaScript auf der Seite? | **Nein** | **Ja** |
| Daten direkt im HTML editierbar? | nur der HTML-Block | **Ja, als JSON-Liste** |
| Suche | nicht verfügbar (bräuchte JS) | optional |
| Status/Kategorie umschalten | ja (reines CSS) | ja |

**Faustregel:**

- Zielseite **verbietet JavaScript** (viele Wikis/SharePoint-HTML-Blöcke filtern
  `<script>`) → **Static**. Inhalte ändert man in der App und exportiert neu.
- Zielseite **erlaubt JavaScript** und die Daten sollen **direkt im Wiki** pflegbar
  bleiben → **JSON + JS**.

> **Wichtig:** Eine JSON-Liste *ganz ohne* JavaScript im Browser zu rendern ist nicht
> möglich – CSS kann keine JSON-Daten durchlaufen. Deshalb ist der JSON-Modus zwingend
> mit JavaScript verbunden. Öffnet man eine JSON-Datei auf einer Seite, die Scripts
> blockiert, bleibt die Fläche leer.

## Einbetten ins Wiki / Intranet

Weil die Datei eigenständig ist, gibt es je nach Plattform zwei Wege:

1. **Als Anhang/iframe** – Datei anhängen und per `<iframe src="…">` einbinden
   (funktioniert für beide Modi, sofern der iframe Scripts ausführen darf).
2. **Als HTML-Block einfügen** – den Inhalt zwischen `<body>…</body>` inklusive des
   `<style>`-Blocks in einen HTML-/Embed-Block der Wiki-Seite kopieren:
   - **Static:** benötigt nur `<style>` + Markup → passt in HTML-Blöcke, die Scripts
     entfernen (z. B. Confluence „HTML"-Makro, SharePoint „Einbetten").
   - **JSON + JS:** die beiden `<script>`-Blöcke (`<script type="application/json"
     id="radar-data">…</script>` **und** der Renderer `<script>…</script>`) müssen
     erhalten bleiben – sonst wird nichts gerendert.

## Static-Modus bearbeiten

Es gibt keine separate Datenliste; die Karten stehen fertig im HTML. Zwei Optionen:

- **Empfohlen:** in der App ändern und **neu exportieren** (die Einstellungen sind ja
  im Projekt gespeichert).
- **Direkt im HTML:** den jeweiligen `<div class="blip-card">…</div>`-Block anpassen
  oder duplizieren. Das ist möglich, aber fehleranfälliger als der JSON-Modus.

## JSON-Modus: die Datenliste bearbeiten

Im JSON-Modus enthält die Datei genau einen Datenblock, den man direkt editiert:

```html
<script type="application/json" id="radar-data">
{ … }
</script>
```

Nach dem Speichern der Wiki-Seite **einmal neu laden** – der Inline-Renderer baut die
Karten aus dem JSON neu auf.

### Aufbau des JSON

```json
{
  "config": {
    "columns": 3,
    "grouping": "status",
    "showGroupToggle": true,
    "showSearch": false,
    "showBindingLevel": true,
    "showBlipIndex": true,
    "labels": {
      "recommendation": "Recommendation",
      "mandatory": "Mandatory",
      "furtherInfo": "Further information"
    },
    "groupToggleLabels": { "status": "By Status", "category": "By Category" },
    "statuses": [
      { "key": "adopt", "label": "Adopt", "color": "#4caf50" },
      { "key": "trial", "label": "Trial", "color": "#2196f3" }
    ],
    "categoryOrder": ["Messaging", "Caching"]
  },
  "blips": [
    {
      "name": "Kafka",
      "status": "adopt",
      "category": "Messaging",
      "mandatory": true,
      "comment": "**Standard** für Event-Streaming. Siehe [Doku](https://kafka.apache.org).",
      "link": "https://kafka.apache.org"
    },
    {
      "name": "Redis",
      "status": "trial",
      "category": "Caching",
      "mandatory": false,
      "comment": "- schneller In-Memory-Cache\n- einfach zu betreiben",
      "link": ""
    }
  ]
}
```

### Ein Blip – die Felder

| Feld | Bedeutung |
|---|---|
| `name` | Anzeigename der Technologie/Praktik |
| `status` | **muss** einem `key` aus `config.statuses` entsprechen (z. B. `adopt`) |
| `category` | **muss** einem Eintrag aus `config.categoryOrder` entsprechen |
| `mandatory` | `true` = „Mandatory"/Pflicht-Badge, `false` = „Recommendation" |
| `comment` | Kurztext, unterstützt einfaches Markdown (siehe unten) |
| `link` | optionaler „Further information"-Link (leer lassen mit `""`) |

### Regeln beim Editieren

- **Blip hinzufügen:** neues Objekt in `blips` einfügen. `status` und `category`
  müssen zu `config.statuses` bzw. `config.categoryOrder` passen. Neue Kategorie? →
  Label zusätzlich in `config.categoryOrder` aufnehmen. Neuer Status? → Objekt
  `{ "key": …, "label": …, "color": … }` in `config.statuses` ergänzen.
- **Nummerierung:** Die Ziffern in den Badges vergibt der Renderer automatisch nach
  Reihenfolge in `blips` – beim Hinzufügen/Löschen also **nicht** von Hand nummerieren.
- **Reihenfolge:** `config.categoryOrder` bestimmt die Reihenfolge in der Ansicht
  „Nach Kategorie"; `config.statuses` die Reihenfolge/Farbe der Status-Abschnitte.
- **Gültiges JSON:** doppelte Anführungszeichen, Komma zwischen Einträgen, **kein**
  Komma nach dem letzten Element. Zeilenumbrüche im Text als `\n` schreiben.
- **`</script>` im Text vermeiden** – das würde den Datenblock vorzeitig beenden. Beim
  Export aus der App wird das automatisch entschärft; beim manuellen Editieren einfach
  nicht verwenden.

### Markdown im `comment`

Unterstützt werden: `**fett**`, `*kursiv*`, `` `code` ``, Links `[Text](https://…)`,
Zeilenumbrüche (`\n`) und einfache Aufzählungen mit `- ` am Zeilenanfang.

## Grenzen / FAQ

- **„Geht der JSON-Modus wirklich ohne JavaScript?"** – Nein. Ohne JS bleibt die Seite
  leer. Für strikt scriptfreie Seiten den **Static**-Modus nehmen.
- **JSON-Seite bleibt leer** – prüfen, ob (a) beide `<script>`-Blöcke erhalten sind und
  (b) das Wiki Inline-Scripts nicht entfernt. Wenn Scripts blockiert sind: Static-Modus.
- **Static-Seite ohne Karten** – prüfen, ob der `<style>`-Block und das Markup
  mitkopiert wurden.
- **Ein Blip fehlt** – meist passt `status` nicht zu einem `key` in `config.statuses`
  oder `category` nicht zu `config.categoryOrder`.
