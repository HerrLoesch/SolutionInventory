# Electron App Setup

Diese Anwendung kann sowohl als Web-App (PWA) als auch als Desktop-App (Electron) ausgeführt werden.

## Entwicklung

### Web-App (PWA)
```bash
npm install
npm run dev
```

### Electron-App
```bash
npm install
npm run electron:dev
```

Die Electron-App lädt im Entwicklungsmodus den Vite-Dev-Server. Starte zuerst `npm run dev` in einem Terminal und dann `npm run electron:preview` in einem anderen.

## Build

### Web-App Build
```bash
npm run build
```

### Electron-App Build
```bash
npm run electron:build
```

Die fertigen Installer/Packages befinden sich im `release/` Ordner.

## Deployment

### GitHub Pages (main Branch)
- Push auf den `main` Branch triggert automatisch ein Deployment auf GitHub Pages
- Die Web-App wird unter der GitHub Pages URL verfügbar sein

### Electron Releases (dev Branch)
- Push auf den `dev` Branch mit einem Tag (z.B. `v1.0.0`) erstellt automatisch:
  - macOS: .dmg und .zip
  - Linux: .AppImage und .deb
  - Windows: .exe (NSIS Installer und Portable)

#### Release erstellen:
```bash
git checkout dev
git tag v1.0.0
git push origin dev --tags
```

## Electron-API

Die Electron-App bietet erweiterte Funktionen über die `window.electronAPI`:

```javascript
// Prüfen ob in Electron ausgeführt
if (window.electronAPI?.isElectron) {
  // Electron-spezifische Funktionen
  
  // Datei speichern
  const result = await window.electronAPI.saveFile('data/myfile.json', data);
  
  // Datei laden
  const result = await window.electronAPI.loadFile('data/myfile.json');
  
  // User Data Pfad abrufen
  const path = await window.electronAPI.getUserDataPath();
}
```

## Architektur

- **electron/main.js**: Electron Hauptprozess (Backend)
- **electron/preload.js**: Sicherer Kommunikationskanal zwischen Main und Renderer
- **src/**: Vue.js Anwendung (Frontend)
- **vite.config.js**: Build-Konfiguration für Web und Electron

## Unterschiede Web vs. Electron

Die Anwendung erkennt automatisch, ob sie in Electron läuft und passt sich entsprechend an:

- **Web**: PWA-Features, Browser-Storage, relative Pfade für GitHub Pages
- **Electron**: Dateisystem-Zugriff, native Dialoge, lokaler Storage im User-Data-Verzeichnis
