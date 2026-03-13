# ToDo List

## Electron Menu Bar

- [ ] Fix the menu handling for Electron to ensure proper functionality.
- [ ] Implement functionality to define requirements for solutions and enable comparison of different solutions.

---

## Electron Agent

- [ ] Add an agent.md, similiar to vue, that checks the electron implementation.
---

## MCP Questionnaire Data Cleaning & Evaluation System

**Objective:** Erstellen Sie einen eigenständigen, Python-basierten MCP-Service mit Flask-UI zum Laden, Anonymisieren und Bewertung von Fragekatalog-Ergebnissen (JSON-Dateien >20.000 Zeilen). Der Service stellt MCP-Tools bereit, die Sie in GitHub Copilot integrieren. Alle Daten bleiben lokal.

**Key Constraints:**
- JSON-Dateien: >20.000 Zeilen → Streaming/Chunking + Batch-Processing erforderlich
- Vollständig lokal: Keine Cloud-Integration, keine Backup-Anforderung für externe Services
- Performance-kritisch für große Dateien: Target <10s für 20K-Zeilen-Datei

**Technology Stack:** Python 3.11+, Flask, Pydantic, MCP Python SDK, SQLite (optional Index), Vanilla JS/HTML

---

### Phase 1: Projektstruktur & Grundinfrastruktur (parallel ausführbar)

- [ ] **1.1** Python-Projekt `questionnaire-mcp-service/` mit Grundstruktur anlegen
  - [ ] 1.1.1 Verzeichnisse erstellen: `src/`, `api/`, `mcp_server/`, `tests/`, `config/`, `static/`, `templates/`
  - [ ] 1.1.2 `pyproject.toml` / `requirements.txt` mit Dependencies: Flask, pydantic, anthropic (MCP SDK), pytest
  - [ ] 1.1.3 `.gitignore` und `README.md` für das Subprojekt

- [ ] **1.2** MCP-Server-Skeleton nach Python SDK implementieren
  - [ ] 1.2.1 `mcp_server/server.py` mit MCP-Server-Initialisierung
  - [ ] 1.2.2 Tool-Stubs anlegen: `load_questionnaires`, `anonymize_questionnaire`, `evaluate_responses`, `export_cleaned_data`, `get_configuration`
  - [ ] 1.2.3 Server als Subprocess startbar machen (für Copilot-Integration später)

- [ ] **1.3** Flask-App mit Blueprint-Struktur
  - [ ] 1.3.1 `api/app.py` mit Flask-Setup, CORS-Config, Error-Handler
  - [ ] 1.3.2 Blueprint-Stubs: `routes/upload.py`, `routes/anonymize.py`, `routes/evaluate.py`, `routes/config.py`
  - [ ] 1.3.3 `static/index.html`, `static/style.css` (minimales Dashboard-Layout)
  - [ ] 1.3.4 Startup-Script: Port 5000, Debug-Mode für Entwicklung

---

### Phase 2: Datenschicht mit Performance-Optimierung

- [ ] **2.1** JSON-Import-Service mit **Streaming** für große Dateien
  - [ ] 2.1.1 `src/services/questionnaire_loader.py` implementieren
    - Funktion: `load_questionnaire(filepath)` → StreamingReader-Objekt
    - Chunked-Lesen (z.B. 10MB Chunks) für >20K-Zeilen-Dateien
  - [ ] 2.1.2 Validierung gegen Schema (aus `categoriesService.js`)
    - [ ] 2.1.2a Pydantic-Models definieren: `Category`, `Metadata`, `Questionnaire`
    - [ ] 2.1.2b Validator: Schemakonsistenz + Feldtypen prüfen
  - [ ] 2.1.3 Error-Handling für malformed/incomplete Dateien
  - [ ] 2.1.4 Test: Sample 20K-Zeilen-Datei laden + validieren

- [ ] **2.2** In-Memory-Optimierung & Lazy-Loading
  - [ ] 2.2.1 Lazy-Loading: Nur Metabereich beim Laden, Antworten on-demand
  - [ ] 2.2.2 Generator-Pattern für große Datensätze (Memory ~constant)
  - [ ] 2.2.3 (Optional) SQLite-Index für schnelle Suche nach IDs/Kategorien
  - [ ] 2.2.4 Benchmarks: Memory-Usage & Load-Zeit für Testdatei messen

---

### Phase 3: Anonymisierungslogik (Core Feature)

- [ ] **3.1** Anonymisierungsservice implementieren
  - [ ] 3.1.1 `src/services/anonymizer.py` erstellen
  - [ ] 3.1.2 **Metabereich-Entfernung:**
    - Felder: `productName`, `company`, `department`, `contactPerson`, `description` → generische Platzhalter
    - Platzhalter-Template: z.B. "REDACTED_ORG_{id}", "REDACTED_PERSON_{id}"
    - [ ] 3.1.2a Mapping-Datei anlegen: O riginal-ID ↔ Anonyme-ID (JSON, lokal gespeichert)
  - [ ] 3.1.3 Regex-Pattern für versteckte Unternehmensangaben in Antwort-Texten
    - [ ] 3.1.3a Pattern-Bibliothek: Firmennamen, E-Mails, Telefon (optional je nach Anforderung)
    - [ ] 3.1.3b Apply-Logik mit Whitelist (um legitime Begriffe nicht zu löschen)
  - [ ] 3.1.4 **Batch-Verarbeitung:** Kategorien in Chunks verarbeiten (z.B. 1000 Einträge/Batch)
    - Funktion: `anonymize(questionnaire, rules, chunk_size=1000)` → anonymized_questionnaire
  - [ ] 3.1.5 Tests: 
    - [ ] 3.1.5a Metabereich vollständig entfernt?
    - [ ] 3.1.5b Performance <10s für 20K-Zeilen-Datei?
    - [ ] 3.1.5c Mapping-Datei korrekt erstellt?

- [ ] **3.2** Konfigurationsmanagement für Anonymisierungsregeln
  - [ ] 3.2.1 `config/anonymization_rules.json` definieren
    - Struktur: `{ "enabled_fields": [...], "regex_patterns": [...], "placeholder_template": "..." }`
  - [ ] 3.2.2 Config-Loader: `src/services/config_service.py`
    - Funktion: `load_config()`, `save_config(new_config)`, `get_default_rules()`
  - [ ] 3.2.3 Validierung: Nur erlaubte Felder + gültige Regex

---

### Phase 4: Flask-UI

- [ ] **4.1** Dashboard
  - [ ] 4.1.1 GET `/` → Hauptseite mit Liste geladener Fragekataloge
    - Spalten: Dateiname, Größe (MB), Zeilen-Count, Status (Raw/Anonymized), Upload-Zeit
  - [ ] 4.1.2 POST `/api/questionnaires` → Upload-Endpunkt
    - File-Handling, Validierung, Speicherung im `data/uploads/` Ordner
  - [ ] 4.1.3 DELETE `/api/questionnaires/{id}` → Datei löschen (+ Mapping-Datei)

- [ ] **4.2** Konfigurationsseite
  - [ ] 4.2.1 GET `/config` → Aktuelle Anonymisierungsregeln anzeigen
  - [ ] 4.2.2 POST `/api/config` → Regeln speichern
    - Enable/Disable von Metabereich-Feldern
    - Custom Regex-Muster hinzufügen/löschen
    - Placeholder-Template ändern
  - [ ] 4.2.3 GET `/api/config/defaults` → Standard-Regeln reset

- [ ] **4.3** Preview & Export
  - [ ] 4.3.1 GET `/preview/{questionnaire_id}` → Vorher/Nachher-Vergleich (Metabereich)
    - Pagination für große Dateien (z.B. 50 Einträge pro Seite)
  - [ ] 4.3.2 POST `/api/anonymize` → Anonymisierung durchführen + speichern
    - Input: `questionnaire_id`, `rules` (optional override)
    - Output: `anonymized_questionnaire_id`, Speicherort, Mapping-Datei-Pfad
  - [ ] 4.3.3 GET `/api/export/{questionnaire_id}` → Download anonym. JSON
    - Streaming-Response für große Dateien (headers: Content-Disposition)
  - [ ] 4.3.4 GET `/api/export/{questionnaire_id}/mapping` → Mapping-File download (optional)

---

### Phase 5: MCP-Server Tools (für Copilot)

- [ ] **5.1** MCP-Tools Core-Implementierung
  - [ ] 5.1.1 `mcp_server/tools/load_questionnaires.py`
    - Tool: `load_questionnaires(filepath: str)` → `{ "id": str, "filename": str, "line_count": int, "metadata_sample": {...} }`
  - [ ] 5.1.2 `mcp_server/tools/anonymize_questionnaire.py`
    - Tool: `anonymize_questionnaire(questionnaire_id: str, rules: dict)` → `{ "status": "success", "output_path": str, "mapping_file": str }`
  - [ ] 5.1.3 `mcp_server/tools/evaluate_responses.py`
    - Tool: `evaluate_responses(questionnaire_id: str)` → `{ "consistency_score": float, "completeness_%": float, "warnings": [...] }`
  - [ ] 5.1.4 `mcp_server/tools/export_cleaned_data.py`
    - Tool: `export_cleaned_data(questionnaire_id: str, output_format: "json"|"csv")` → `{ "filepath": str, "size_mb": float }`
  - [ ] 5.1.5 `mcp_server/tools/get_configuration.py`
    - Tool: `get_configuration()` → `{ "rules": {...}, "loaded_questionnaires": [...] }`

- [ ] **5.2** Tool-Registrierung im MCP-Server
  - [ ] 5.2.1 Alle Tools in `mcp_server/server.py` registrieren
  - [ ] 5.2.2 Error-Handling pro Tool (aussagekräftige MCP-Errors)
  - [ ] 5.2.3 Logging für alle Tool-Calls

- [ ] **5.3** MCP-Server Tests
  - [ ] 5.3.1 Unit-Tests für jeden Tool (mock data)
  - [ ] 5.3.2 Integration-Test: MCP-Server startet + Tool-Call erfolgreich
  - [ ] 5.3.3 Performance-Test: Tool-Response <2s für 20K-Zeilen-Datei

---

### Phase 6: GitHub Copilot Integration

- [ ] **6.1** Copilot-Konfiguration
  - [ ] 6.1.1 `copilot-instructions.md` erstellen im Workspace-Root
    - Beschreibung des MCP-Service + verfügbarer Tools
    - Beispiel-Prompts: "Bereinige diese Fragekatalog-Datei"
    - Kontext über Lokalität der Daten
  - [ ] 6.1.2 `.agent.md` für "Questionnaire Cleaner" Agent
    - Agent-Name: "Questionnaire Cleaner"
    - Spezialisierung: Datenbereinigung, Anonymisierung, Qualitäts-Checks
    - Tool-Zugang: MCP-Tools + Tipps für Copilot
    - Activation-Pattern: z.B. Nennung von "questionnaire" oder "anonymize"

- [ ] **6.2** MCP-Service Startup-Integration
  - [ ] 6.2.1 `scripts/start-mcp-server.sh` (oder `.ps1` für Windows)
    - Startet Python MCP-Server auf Port 3000 (vs Code MCP default)
    - Verbindung zu Copilot konfigurieren
  - [ ] 6.2.2 VS Code `settings.json` Update (optional)
    - MCP-Server-Pfad konfigurieren
  - [ ] 6.2.3 Startup-Check: Server läuft, Tools sind im Copilot verfügbar

- [ ] **6.3** Copilot Agent Testing
  - [ ] 6.3.1 Agent im Copilot Chat testen: "@Questionnaire Cleaner Bereinige sample_questionaire.json"
  - [ ] 6.3.2 Tool-Calls beobachten + verifizieren
  - [ ] 6.3.3 Response validieren (Anonymisierung erfolgt, Datei wird gespeichert)

---

### Phase 7: Dokumentation & Finalisierung

- [ ] **7.1** README für `questionnaire-mcp-service/`
  - [ ] 7.1.1 Übersicht: Was macht der Service?
  - [ ] 7.1.2 Installation: Python-Env, Dependencies, Startup
  - [ ] 7.1.3 API-Dokumentation: Alle Endpoints + MCP-Tools
  - [ ] 7.1.4 Configuration: anonymization_rules.json Struktur
  - [ ] 7.1.5 Troubleshooting: Häufige Fehler + Lösungen

- [ ] **7.2** Copilot Integration Guide
  - [ ] 7.2.1 Schritt-für-Schritt: Service starten + Copilot verbinden
  - [ ] 7.2.2 Example Workflows: "Lade Fragenkatalog → Anonymisiere → Exportiere"
  - [ ] 7.2.3 Agent-Verwendung: Wann "Questionnaire Cleaner" nutzen

- [ ] **7.3** Test-Coverage
  - [ ] 7.3.1 Unit-Tests für Services (Loader, Anonymizer, Config)
  - [ ] 7.3.2 Integration-Tests für Flask-API
  - [ ] 7.3.3 E2E-Test: Upload → Anonymisierung → Export erfolgt
  - [ ] 7.3.4 Performance-Tests: >20K-Zeilen <10s

- [ ] **7.4** Deployment-Checklist
  - [ ] 7.4.1 Python 3.11+ installiert
  - [ ] 7.4.2 Dependencies installiert: `pip install -r requirements.txt`
  - [ ] 7.4.3 data/ Ordner mit Subverzeichnissen angelegt
  - [ ] 7.4.4 MCP-Server startet fehlerfrei: `python mcp_server/server.py`
  - [ ] 7.4.5 Flask startet auf Port 5000: `python api/app.py`
  - [ ] 7.4.6 Copilot-Integration konfiguriert + Agent aktiv

---

### Verification Checklist (End-to-End)

- [ ] **Setup**
  - [ ] MCP-Server startet ohne Fehler
  - [ ] Flask-App läuft auf http://localhost:5000
  - [ ] MCP-Tools sind von Copilot aufrufbar

- [ ] **Funktionalität**
  - [ ] Testfragenkatalog (20K+ Zeilen) wird ohne Memory-Overflow geladen
  - [ ] Anonymisierung entfernt 100% der Metabereich-Felder (Test-Assertions)
  - [ ] Anonymisierung-Performance: <10s für 20K-Zeilen-Datei
  - [ ] Flask-UI zeigt Upload + Anonymisierungs-Preview (mit Pagination)
  - [ ] Export-Datei ist identisch groß wie Original (nur Inhalte anonymisiert)
  - [ ] Mapping-Datei wird korrekt erstellt + kann geladen werden

- [ ] **Copilot Integration**
  - [ ] Custom Agent "Questionnaire Cleaner" ist aktiv
  - [ ] Agent antwortet auf "Bereinige diese Fragen" Anfrage
  - [ ] Tool-Calls funktionieren: load → anonymize → export
  - [ ] Ergebnisse werden lokal gespeichert (keine Cloud-Uploads)

- [ ] **Quality**
  - [ ] Alle Unit-Tests grün
  - [ ] Integration-Tests grün
  - [ ] E2E-Test mit echtem Fragenkatalog erfolgreich
  - [ ] Code-Style einheitlich (Black/Flake8 für Python)

---

## Future Enhancements (Optional)

- [ ] **Phase 3a: Advanced Evaluation** (nur wenn Modell-Integration gewünscht)
  - [ ] Machine Learning: Konsistenz-Score für Antworten berechnen
  - [ ] LLM-Integration (z.B. via Claude API) für semantische Qualitäts-Checks
  - [ ] Recommendations: Vorschläge zur Verbesserung von Antwortkonsistenz

- [ ] **Phase 3b: Batch-Processing**
  - [ ] Mehrere Fragekataloge parallel verarbeiten
  - [ ] Job-Queue für große Datenmengen
  - [ ] Progress-Tracking über WebSocket

- [ ] **Phase 3c: Comparison & Reporting**
  - [ ] Multiple Fragekataloge vergleichen (Anonymisiert)
  - [ ] Reports generieren (PDF, HTML)
  - [ ] Trend-Analyse über Zeit (wenn Versionierung erforderlich)