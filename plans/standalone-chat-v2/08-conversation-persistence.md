# Phase 8: Konversations-Speicherung

ULTRATHINK

**Status**: ✅ ERLEDIGT
**Chat**: 3
**Geschätzte Tokens**: ~40.000

---

## Was ist das Problem?

Der Verlauf soll nicht nur im Speicher bleiben.
Bei Neustart der App müssen Chats wieder da sein.
Außerdem braucht es klare Regeln für Archivieren und Löschen.

## Was soll passieren?

Eine stabile Speicherung für Sessions, Nachrichten und Metadaten.
Laden und Speichern sollen robust sein, auch bei Unterbrechungen.

## Wie der User die App danach erlebt

1. App schließen und wieder öffnen: Chats sind noch da.
2. Aktiver Chat wird wieder geöffnet.
3. Archivierte Chats sind separat sichtbar.
4. Gelöschte Chats kommen nicht mehr zurück.

---

## Betroffene Dateien

### Neue Dateien (`apps/chat/src/`)

| Datei                             | Zweck                             |
| --------------------------------- | --------------------------------- |
| `services/session-persistence.ts` | Speichern/Laden von Session-Daten |
| `services/session-migration.ts`   | Versions-Umzug alter Daten        |
| `hooks/use-session-hydration.ts`  | Laden beim App-Start              |

### Geänderte Dateien

| Datei                          | Was ändern                     |
| ------------------------------ | ------------------------------ |
| `stores/session-store.ts`      | Persistenz-Aufrufe integrieren |
| `components/history-panel.tsx` | Archiv/Löschen Aktionen nutzen |

---

## Aufgaben

### Aufgabe 8.1: Datenmodell für Speicherung

- Session-Metadaten separat halten
- Nachrichten pro Session in eigener Struktur speichern
- Version-Feld einbauen (z.B. `schemaVersion: 1`)
- Große Inhalte begrenzen (z.B. max. Nachrichten pro Session)

### Aufgabe 8.2: Laden beim Start

- Beim Start zuerst Metadaten laden
- Danach aktive Session und letzte Ansicht herstellen
- Wenn Daten fehlen oder kaputt sind: sichere Standardwerte nutzen

### Aufgabe 8.3: Speichern bei Änderungen

- Speichern mit kleinem Delay (debounce), damit es flüssig bleibt
- Nur geänderte Teile schreiben, nicht immer alles
- Bei Fehlern klare Fehlermeldung im Log

### Aufgabe 8.4: Archivieren und Löschen

- Archivieren: bleibt gespeichert, aber standardmäßig ausgeblendet
- Löschen: entfernt Metadaten und Nachrichten dauerhaft
- Sicherheitsabfrage vor Löschen

### Aufgabe 8.5: Migration alter Daten

- Alte Formate erkennen
- Automatisch ins neue Format umwandeln
- Bei nicht lesbaren Daten: Backup anlegen und sauber neu starten

### Aufgabe 8.6: Wiederherstellung nach Fehler

- Falls Datei korrupt: letzte lauffähige Version laden
- Falls nichts geht: leer starten, aber Info für den User zeigen

---

## Prüfpunkte

- [x] Sessions bleiben nach Neustart erhalten
- [x] Aktiver Tab wird wiederhergestellt
- [x] Archivieren/Löschen funktioniert sicher
- [x] Datenmigration läuft ohne manuellen Eingriff
- [x] Fehlerfälle führen nicht zum App-Absturz

---

## Edge Cases

| Fall                                   | Lösung                                  |
| -------------------------------------- | --------------------------------------- |
| Plötzlicher App-Abbruch beim Speichern | Nächster Start lädt letzte valide Daten |
| Sehr viele große Chats                 | Begrenzung + optionales Aufräumen       |
| Alte Daten ohne Version                | Migration mit sicheren Defaults         |
| Unerwartete Zeichen in Texten          | Immer UTF-8 lesen und speichern         |
