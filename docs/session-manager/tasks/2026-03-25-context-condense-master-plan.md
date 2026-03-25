# Master-Plan: Automatic Context Condense (wie Codex, für Automaker)

> Status: 🟢 Kern-Umsetzung abgeschlossen (UI + Auto-Trigger + Session-Verknüpfung)
> Datum: 2026-03-25
> Ziel: Kontext automatisch zusammenfassen, neuen Chat öffnen, sauber weiterarbeiten

---

## Was wir bauen

Wenn ein Chat zu groß wird, soll Automaker automatisch:

1. den bisherigen Verlauf kurz zusammenfassen,
2. einen neuen Chat öffnen,
3. die Zusammenfassung in den neuen Chat übernehmen,
4. und der User kann direkt weitermachen.

Zusätzlich bekommt der User unten rechts eine klare Anzeige:

- wie voll der Kontext ist,
- ab wann automatisch zusammengefasst wird,
- und ob Auto-Condense aktiv ist.

---

## Wichtige Basis, die schon da ist

Wir starten nicht bei null. Diese Teile existieren bereits:

- `generateContextSummary(...)` in `apps/ui/src/lib/copy-all-chat.ts`
- Auto-Session-Wechsel mit Pending-Content in `apps/ui/src/components/views/agent-view.tsx`
- Session-Erstellung + Empty-Session-Reuse in `apps/ui/src/components/session-manager.tsx`
- Modell-spezifische Einstellungen im bestehenden Time-Limiter-Store

Das heißt: Wir erweitern die bestehende Logik, statt etwas komplett Neues zu bauen.

---

## Umsetzung in Phasen

## Phase 1: Kontext-Messung + Schwellenwert (Token)

### Ziel

Automaker weiß pro aktuellem Chat:

- geschätzte Input-Tokens,
- Kontextfenster vom gewählten Modell,
- Auslastung in Prozent.

### Dateien

- `apps/ui/src/components/views/agent-view.tsx`
- `apps/ui/src/lib/copy-all-chat.ts`
- `apps/ui/src/hooks/queries/use-models.ts` (Nutzung, kein Umbau)

### Umsetzung

1. Token-Schätzung aus bestehenden Nachrichten (gleiche einfache Logik wie im Chat-Bereich).
2. Modell-Kontextfenster über `useAvailableModels()` ziehen.
3. Prozent-Auslastung berechnen (`geschätzt / contextWindow`).
4. Sicherer Fallback, wenn ein Modell kein Kontextfenster liefert.

---

## Phase 2: Auto-Condense-Einstellungen im Store

### Ziel

Einstellungen pro Modell speichern:

- Auto-Condense an/aus,
- Schwelle in Prozent (z. B. 80%),
- optional weiter nutzbar mit dem bestehenden Time-Limiter.

### Dateien

- `apps/ui/src/store/time-limiter-store.ts`

### Umsetzung

1. Store um Condense-Felder erweitern.
2. Persistenz in `localStorage` mit eigenen Keys.
3. Modell-spezifisches Laden/Speichern wie beim Time-Limiter.
4. Bestehende Time-Limiter-Funktion bleibt kompatibel.

---

## Phase 3: Einfache UI im Input-Bereich

### Ziel

Unten im Eingabebereich sieht der User:

- aktuelle Kontext-Auslastung (`z. B. ~72k / 128k, 56%`),
- Schalter „Automatisch zusammenfassen“,
- Feld „ab X% automatisch“.

### Dateien

- `apps/ui/src/components/views/agent-view/input-area/input-controls.tsx`
- `apps/ui/src/components/views/agent-view/input-area/time-limiter-settings.tsx`
- `apps/ui/src/components/views/agent-view/input-area/agent-input-area.tsx` (nur Prop-Durchgabe, falls nötig)

### Umsetzung

1. Bestehendes Settings-Dropdown erweitern statt neue Extra-Komponente.
2. UI-Texte in einfacher Sprache (8.-Klasse verständlich).
3. Klare Farblogik für sicher/warnung/nahe Grenze.
4. Keine transparenten Haupt-Dialogflächen.

---

## Phase 4: Auto-Trigger (Condense + neuer Chat)

### Ziel

Wenn Schwelle erreicht und Agent gerade nicht läuft:

1. Zusammenfassung erzeugen,
2. in `pendingCopiedContent` legen,
3. neue Session erstellen,
4. Zusammenfassung im neuen Chat einfügen.

### Dateien

- `apps/ui/src/components/views/agent-view.tsx`
- `apps/ui/src/components/session-manager.tsx` (nur falls wir Session-Quelle/Metadaten erweitern)

### Umsetzung

1. Neue Trigger-Prüfung auf Token-Basis ergänzen.
2. Schutz gegen Endlosschleife (pro Session nur einmal auto-condense).
3. Nicht während laufender Antwort auslösen.
4. Nur auslösen, wenn Verbindung stabil ist.

---

## Phase 5: Historie sauber halten

### Ziel

Neue Chats aus Auto-Condense sollen in der Historie nachvollziehbar bleiben, ohne Chaos.

### Dateien

- `apps/ui/src/hooks/use-session-grouping.ts`
- `apps/ui/src/components/session-manager/orchestrator-run-header.tsx`
- `apps/server/src/routes/sessions/routes/create.ts` (nur falls zusätzliche Metadaten nötig)
- `apps/server/src/services/agent-service.ts` (nur falls zusätzliche Metadaten nötig)

### Umsetzung

1. Prüfen, ob bestehende Gruppierung reicht.
2. Wenn nötig, minimale Metadaten ergänzen (ohne Breaking Change).
3. Bestehende Orchestrator-Logik bleibt unangetastet.

Hinweis:
Orchestrator = unser Ablauf-Steuerer für mehrere KI-Schritte hintereinander.

---

## Edge Cases (wichtig)

1. Modell hat kein `contextWindow`:
   Fallback-Wert nutzen, Auto-Trigger nur bei belastbarer Berechnung.

2. Leere Session wird wiederverwendet:
   Zusammenfassung darf nicht verloren gehen.

3. User erstellt manuell eine neue Session:
   Keine automatische Condense-Kette starten.

4. Sehr kurze Chats:
   Kein Auto-Condense bei zu wenig Inhalt.

5. Mehrfaches Triggern direkt hintereinander:
   Einmal-Guard pro Session.

---

## Kurzes Nutzerbeispiel

1. User arbeitet 20 Minuten im Chat.
2. Unten rechts steht z. B. `92%`.
3. Auto-Condense ist aktiv ab `90%`.
4. Automaker erstellt automatisch einen neuen Chat.
5. Im neuen Chat steht die kompakte Zusammenfassung.
6. User kann direkt weiterschreiben.

---

## Abnahme (Done-Kriterien)

- [x] Token-Auslastung unten sichtbar
- [x] Auto-Condense pro Modell einstellbar
- [x] Automatischer Wechsel bei Schwelle funktioniert
- [x] Kein Endlos-Trigger
- [x] Session-Historie bleibt stabil (Parent-Link bei Auto-Condense)
- [x] `npm run typecheck` läuft sauber
- [x] UTF-8 Check läuft sauber (für geänderte Dateien)

---

## Geänderte Kern-Dateien (Plan-Stand)

- `apps/ui/src/components/views/agent-view.tsx`
- `apps/ui/src/lib/copy-all-chat.ts`
- `apps/ui/src/store/time-limiter-store.ts`
- `apps/ui/src/components/views/agent-view/input-area/input-controls.tsx`
- `apps/ui/src/components/views/agent-view/input-area/time-limiter-settings.tsx`
- optional: `apps/ui/src/hooks/use-session-grouping.ts`
- optional: `apps/server/src/routes/sessions/routes/create.ts`
- optional: `apps/server/src/services/agent-service.ts`
