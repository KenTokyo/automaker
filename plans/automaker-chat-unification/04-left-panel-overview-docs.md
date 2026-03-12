ULTRATHINK

# Phase 4 - Linke Seite: Sessions, Docs, Übersicht

## Status

- Status: ✅ Fertig
- Priorität: Hoch
- Bereich: Frontend-Phase

## Ziel

Die linke Seite im Automaker-Chat soll nicht mehr nur zwei Bereiche haben.

Stattdessen bekommt sie drei klare Tabs:

1. `Sessions`
2. `Docs`
3. `Übersicht`

Wichtig dabei:
Die linke Übersicht darf keine neue Insel werden.
Sie soll dieselbe Daten- und Anzeige-Basis nutzen wie die rechte Übersicht aus Phase 3.

## Was bedeutet das konkret für den Nutzer?

Der Nutzer kann links schnell wechseln:

1. alte Chats ansehen
2. Projekt-Dokumente öffnen
3. letzte Projekt-Übersicht prüfen

Beispiel:
Ein Nutzer arbeitet mitten im Chat.
Links tippt er kurz auf `Übersicht`, liest die letzte Zusammenfassung und springt direkt zurück zu `Sessions`.

## Bestehende Grundlage

Heute gibt es schon:

1. `SessionManager` mit Tabs für `Sessions` und `Docs`
2. `DocsPanel` mit eigener Logik für Ordner, Öffnen und Speichern
3. die linke Tab-Idee im Standalone-Chat
4. die Übersicht-Bausteine aus `apps/chat`

Die Aufgabe ist also nicht Neubau, sondern sauberes Erweitern.

## Architektur-Entscheidung

Die linke Seite bekommt **einen** klaren Tab-Zustand statt einer Sonderlösung nur für `Docs`.

Das heißt:

1. die bisherige `docsOpen`-Logik reicht langfristig nicht mehr
2. links braucht es einen echten aktiven Tab wie `sessions | docs | overview`
3. die Übersicht links nutzt dieselben Adapter wie rechts
4. `SessionManager` bleibt der Container, wird aber intern sauber aufgeteilt

## Geplante Bausteine

### 1. Linke Tab-Basis im Store

- Zweck: linker Bereich merkt sich pro Projekt den aktiven Tab
- Warum: `docsOpen` ist nur ein Ja/Nein-Schalter und reicht für drei Tabs nicht
- Betroffene Stelle:
  - `apps/ui/src/store/app-store.ts`
- Geschätzter Umfang: ~80 bis 140 Zeilen

### 2. SessionManager in klare Teilbereiche aufteilen

- Zweck: die linke Fläche bleibt lesbar und wächst nicht chaotisch
- Mögliche Teilbereiche:
  - Tab-Leiste
  - Sessions-Bereich
  - Docs-Bereich
  - Übersichts-Bereich
- Betroffene Stelle:
  - `apps/ui/src/components/session-manager.tsx`
- Geschätzter Umfang: ~180 bis 280 Zeilen

### 3. Linker Übersicht-Tab als schneller Einstieg

- Zweck: dieselbe Übersicht auch links erreichbar machen
- Wiederverwendung:
  - Overview-Adapter aus Phase 3
  - Dashboard-Anzeige-Bausteine aus `apps/chat`
- Geschätzter Umfang: ~140 bis 220 Zeilen

### 4. Docs-Verhalten sauber halten

- Zweck: `Docs` soll trotz neuem dritten Tab ruhig weiter funktionieren
- Wichtig:
  - geöffnete Datei nicht unnötig verlieren
  - Ordnerpfad stabil halten
  - Speichern darf nicht von Tab-Wechseln kaputtgehen
- Geschätzter Umfang: ~80 bis 140 Zeilen

### 5. Mobile und schmale Breiten mitdenken

- Zweck: linke Overlay-Seite bleibt nutzbar und nicht überladen
- Verhalten:
  - Tabs bleiben antippbar
  - Übersicht darf den schmalen Raum nicht sprengen
  - bestehendes Öffnen/Schließen bleibt verständlich
- Geschätzter Umfang: ~60 bis 120 Zeilen

## Benötigte Komponenten

| Komponente oder Bereich | Zweck                                                | Geschätzte Zeilen |
| ----------------------- | ---------------------------------------------------- | ----------------- |
| LeftSidebarTabs         | schaltet zwischen `Sessions`, `Docs` und `Übersicht` | 60-100            |
| SessionManagerShell     | hält linken Gesamtaufbau zusammen                    | 120-180           |
| SessionListPanel        | kapselt die heutige Sessions-Logik besser ab         | 120-180           |
| LeftOverviewPanel       | zeigt die Übersicht links als Schnellzugriff         | 140-220           |
| LeftOverviewAdapter     | nutzt dieselbe Datenbasis wie rechts                 | 100-160           |

## Wiederverwendung

Diese Teile sollen bevorzugt wiederverwendet werden:

- `apps/ui/src/components/session-manager.tsx`
- `apps/ui/src/components/views/agent-view/components/docs-panel.tsx`
- `apps/chat/src/components/chat-sidebar-left.tsx`
- `apps/chat/src/components/dashboard-panel.tsx`
- die in Phase 3 geplanten Overview-Adapter und Anzeige-Bausteine

Diese Teile sollen **nicht** doppelt entstehen:

1. ein zweiter Overview-Store nur für links
2. eine zweite API-Schicht nur für links
3. eine neue Docs-Logik neben `DocsPanel`

## Nutzerfluss

### Beispiel 1 - Schnell zur Übersicht

1. Nutzer arbeitet in einem Chat.
2. Links tippt er auf `Übersicht`.
3. Er sieht die letzte Zusammenfassung.
4. Danach geht er direkt zurück zu `Sessions`.

### Beispiel 2 - Aus Chat-Verlauf in Docs

1. Nutzer speichert einen Chat in ein Dokument.
2. Links tippt er auf `Docs`.
3. Das Dokument ist direkt erreichbar.
4. Danach kann er wieder auf `Sessions` gehen, ohne dass alles neu aufgebaut wird.

## Fragen und Edge Cases

### Was passiert beim Projektwechsel?

Der linke aktive Tab sollte pro Projekt gemerkt werden.
Sonst landet der Nutzer ständig im falschen Bereich.

### Was passiert, wenn ein Dokument offen ist und der Nutzer auf `Übersicht` wechselt?

Die aktuelle Datei sollte nicht verloren gehen.
Beim Zurückwechseln soll sie weiter offen sein, wenn das sinnvoll ist.

### Was passiert auf Mobilgeräten?

Die linke Seite ist dort ein Overlay.
Der neue dritte Tab darf dieses Overlay nicht unruhig oder zu eng machen.

### Was passiert, wenn für die Übersicht noch keine Daten da sind?

Dann braucht auch der linke Bereich einen klaren leeren Zustand.
Der Nutzer soll sofort verstehen, was er als Nächstes tun kann.

### Was passiert, wenn rechts schon die Übersicht offen ist?

Links und rechts dürfen nicht gegeneinander arbeiten.
Sie sollen denselben Datenstand zeigen, aber nicht unnötig denselben Zustand zerstören.

## Nicht Teil dieser Phase

1. rechter Bereich mit `Browser`, `Dateien` und `Übersicht`
2. Altlasten-Abbau im Standalone-Chat
3. Abschluss-Prüfung und Übergabe

## Fertig, wenn

1. links drei klare Tabs sichtbar sind
2. `Docs` weiter stabil läuft
3. `Übersicht` links denselben Datenweg wie rechts nutzt
4. `SessionManager` nicht chaotischer, sondern klarer wird
5. Projektwechsel und Mobilansicht mitgedacht sind

## Abhängigkeit für nächste Phase

Phase 5 räumt danach die alten Standalone-Wege auf.
Erst wenn klar ist, wie links und rechts im Automaker-Chat zusammenpassen, lohnt sich das saubere Aufräumen.
