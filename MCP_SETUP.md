# MCP Integration Setup für SolutionInventory

## 📋 Überblick

Der `.NET-MCP-Server` läuft auf `http://localhost:5100` und bietet 4 spezialisierte Tools zum Zugriff auf Workspace-Daten:

1. **list_categories** — Alle Kategorien + subcategory Einträge
2. **list_questionnaires** — Fragenkatalog-Struktur ohne Metadaten
3. **get_answers_for_category** — Gefilterte Antworten nach Kategorie/Eintrag/Fragebogen
4. **get_tech_radar** — Tech-Radar-Überrides und Category-Reihenfolge

## 🚀 Setup-Schritte

### 1. MCP Server starten

```powershell
cd C:\repos\SolutionInventory\MCP\McpServer
dotnet run
```

Der Server läuft dann auf `http://localhost:5100`.

### 2. Workspace in Management-UI laden

Öffne im Browser: **http://localhost:5100**

- **Workspace Tab**: "Choose File…" → JSON-Datei wählen oder "Load Example"
- Das lädt die Workspace-Daten in den Server

### 3. VS Code Copilot konfigurieren

Die beiden Dateien sind bereits gesetzt:
- `.vscode/settings.json` — MCP Server Konfiguration
- `mcp-bridge.js` — Node.js Bridge zwischen VS Code und .NET Server

Reload VS Code oder öffne diesen Workspace neu.

### 4. Copilot MCP aktivieren

Im VS Code Chat:
- Öffne die **"Manage MCP Servers"** Option (über die Zahnrad-Icon im Chat)
- Bestätige, dass **SolutionInventory** aktiviert ist
- Klicke **"Reconnect"** falls nötig

Jetzt kann ich auf deine Workspace-Daten zugreifen! 🎯

## 🔧 Wie es funktioniert

```
VS Code Chat
    ↓
Copilot Extension (stdin/stdout)
    ↓
mcp-bridge.js (Node.js)
    ↓
HTTP POST /message → .NET MCP Server
    ↓
ProjectRepository.GetCategories() / GetAnswersForCategory() / etc.
    ↓
Markdown-formattierte Antwort
    ↓
Zurück zu Copilot
```

## 💡 Beispiele

### Kategorien auflisten
Sage einfach: *"Zeige mir alle Kategorien im Workspace"*
→ Copilot ruft `list_categories` auf

### Antworten für Kategorie filtern
Sage: *"Welche Technologien wurden für die Kategorie 'Architecture' eingetragen?"*
→ Copilot ruft `get_answers_for_category(categoryId="architecture")` auf

### Tech Radar ansehen
Sage: *"Zeige den Tech Radar"*
→ Copilot ruft `get_tech_radar` auf

## ⚠️ Troubleshooting

### MCP Server verbindet nicht
1. ✅ Ist der .NET Server wirklich laufen? → `dotnet run` im `McpServer` Ordner
2. ✅ Läuft er auf `http://localhost:5100`? → Browser: http://localhost:5100
3. ✅ VS Code reloaden: Ctrl+Shift+P → "Developer: Reload Window"

### "No workspace loaded"
1. ✅ Gehe zu http://localhost:5100
2. ✅ Tab "Workspace" öffnen
3. ✅ "Choose File…" klicken und eine JSON ausw ählen oder "Load Example"
4. ✅ Warte bis "✓ Workspace summary" angezeigt wird

### Copilot sieht die Tools nicht
```
Ctrl+Shift+P → "Manage MCP Servers"
↓
"SolutionInventory" anklicken
↓
"Reconnect" klicken und warten
```

## 🔌 Wenn Node.js nicht installiert

Falls Node.js nicht im PATH ist, kannst du auch einen **PowerShell-Wrapper** verwenden:

1. Ändere `.vscode/settings.json`:
```json
{
  "modelContextProtocol": {
    "servers": {
      "SolutionInventory": {
        "command": "C:\\Program Files\\nodejs\\node.exe",
        "args": ["mcp-bridge.js"],
        "cwd": "${workspaceFolder}"
      }
    }
  }
}
```

2. Ersetze den Pfad mit deinem Node.js Installations-Pfad

---

**Du bist bereit!** 🚀 Stelle jetzt eine Frage im Copilot Chat, und ich werde auf deine Workspace-Daten zugreifen können!
