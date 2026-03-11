# Phase 10: Markdown Explorer Backend-API

ULTRATHINK

**Status**: ✅ ERLEDIGT
**Chat**: 4
**Geschätzte Tokens**: ~45.000

---

## Was ist das Problem?

Der Explorer braucht Daten aus dem Server.
Ohne Backend-API kann die rechte Sidebar keine Dateien oder Suchtreffer laden.

## Was soll passieren?

Neue API-Endpunkte für Dateibaum, Dateiinhalt und Suche.
Sicher, schnell und klar begrenzt auf erlaubte Projektpfade.

## Wie der User die App danach erlebt

1. Explorer lädt schnell und zuverlässig.
2. Suchtreffer kommen ohne lange Wartezeit.
3. Keine fremden Pfade außerhalb des Projekts.

---

## Betroffene Dateien

### Neue Dateien (`apps/server/src/`)

| Datei | Zweck |
|---|---|
| `routes/markdown-explorer/index.ts` | Router für Explorer-Endpunkte |
| `routes/markdown-explorer/routes/tree.ts` | Dateibaum liefern |
| `routes/markdown-explorer/routes/file.ts` | Dateiinhalt liefern |
| `routes/markdown-explorer/routes/search.ts` | Suchtreffer liefern |
| `services/markdown-explorer-service.ts` | Geschäftslogik für Lesen/Suchen |

### Geänderte Dateien

| Datei | Was ändern |
|---|---|
| `apps/server/src/index.ts` | Neue Route registrieren |

---

## Aufgaben

### Aufgabe 10.1: Dateibaum-Endpunkt

- `GET /api/markdown-explorer/tree`
- Gibt Ordner/Dateien als Baumstruktur zurück
- Nur erlaubte Root-Pfade
- Versteckte Systemordner optional ausblenden

### Aufgabe 10.2: Dateiinhalt-Endpunkt

- `GET /api/markdown-explorer/file?path=...`
- Liefert UTF-8 Textinhalt und Metadaten
- Große Dateien begrenzen und ggf. kürzen
- Fehlercode bei nicht lesbarer Datei

### Aufgabe 10.3: Such-Endpunkt

- `GET /api/markdown-explorer/search?q=...`
- Suche im Dateinamen und optional im Inhalt
- Treffer mit Pfad, Zeilennummer und Snippet
- Paging für große Ergebnisse

### Aufgabe 10.4: Sicherheit

- Pfad-Normalisierung gegen Path-Tricks
- Zugriff nur im Projektordner
- Klare Fehlerantworten ohne interne Details

### Aufgabe 10.5: Leistung

- Caching für Baumdaten
- Zeitlimit für tiefe Inhaltssuchen
- Abbruchsignal bei neuer Suche

### Aufgabe 10.6: Fehlerbehandlung

- Einheitliches Antwortformat für Fehler
- Logeintrag mit kurzer Ursache
- Frontend-taugliche Meldung

---

## Prüfpunkte

- [ ] Baum-Endpunkt liefert stabile Daten
- [ ] Dateiinhalt wird korrekt als UTF-8 geliefert
- [ ] Such-Endpunkt liefert Zeilen-Treffer
- [ ] Kein Zugriff außerhalb des Projekts
- [ ] Große Projekte bleiben flüssig

---

## Edge Cases

| Fall | Lösung |
|---|---|
| Binary-Datei versehentlich angefragt | Als „nicht unterstützte Datei“ ablehnen |
| Suche über 100k Dateien | Paging + Abbruch + Zeitlimit |
| Umlaute im Pfad | UTF-8 und normalisierte Pfade nutzen |
| Datei während Lesen geändert | Versionshinweis oder erneutes Laden |
