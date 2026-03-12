# 🎯 Multi-Session Parallelismus & Running-Indicator

**Erstellt:** 2026-03-12
**Typ:** 🐛 Fehlerbehebung + 🆕 Erweiterung
**Betroffene Bereiche:** Frontend (`apps/ui`)

---

## 🚀 Strategie & Ziele

### Was soll erreicht werden?

1. **Gelber Rand für laufende Sessions** – Wenn eine Session gerade arbeitet, soll sie in der Session-Liste sofort erkennbar sein (gelber/amber Rand).
2. **Multi-Session reparieren** – "New" klicken darf eine laufende Session nicht stören. Der User muss parallel in mehreren Sessions arbeiten können.

### Was bedeutet das für den User?

- Du kannst in einem Chat eine Aufgabe starten, "New" klicken, und im neuen Chat sofort weiterarbeiten.
- Der alte Chat läuft im Hintergrund weiter, ohne kaputt zu gehen.
- In der Session-Liste siehst du sofort, welche Chats gerade aktiv arbeiten (gelber Rand).

---

## ❓ Edge Cases & Antworten

✅ **Was passiert, wenn ich schnell hin und her zwischen Sessions wechsle?**
Jede Session lädt ihren eigenen Verlauf vom Server. Nachrichten, die der Agent produziert hat, während du in einer anderen Session warst, sind alle da wenn du zurückwechselst.

✅ **Was passiert mit der alten Session auf dem Server, wenn ich eine neue erstelle?**
Nichts! Der Server verwaltet jede Session unabhängig. Die alte Session läuft einfach weiter.

✅ **Kann ich in beiden Sessions gleichzeitig Nachrichten senden?**
Ja. Jede Session hat ihren eigenen Zustand. Nur innerhalb einer einzelnen Session läuft immer nur eine Nachricht gleichzeitig (Warteschlange springt ein).

✅ **Was, wenn ich während des Session-Wechsels eine Nachricht sende?**
Aktuell wird die Nachricht still verworfen (das ist der Bug). Nach dem Fix wartet die UI kurz bis die neue Session geladen ist und erlaubt dann das Senden.

---

## 📋 Phasen

### Phase 1: ✅ Gelber Rand für laufende Sessions (~60 Zeilen)

**Was ändert sich?**
Laufende Sessions bekommen einen gelben/amber Rand in der Session-Liste, damit man sofort sieht, welche Chats gerade arbeiten.

**Was bedeutet das konkret für den User?**
Du scrollst durch deine Sessions und siehst sofort: "Ah, dieser Chat arbeitet noch" – ohne den Chat erst öffnen zu müssen.

**Betroffene Dateien:**

#### 1.1 `apps/ui/src/components/session-manager/session-list-item.tsx` (~30 Zeilen Änderung)

- Im `cn()` Aufruf für den Container (Zeile 86-98) einen neuen Zustand hinzufügen
- Bedingung: `isRunning && !isCurrentSession` → gelber/amber Border
- Bedingung: `isRunning && isCurrentSession` → gelber Border statt primary Border (aktiv + laufend)
- Klassen: `border-amber-500/70 bg-amber-500/5 shadow-[0_8px_20px_-16px_theme(colors.amber.500)]`
- "läuft"-Badge Farbe von `bg-primary/10 text-primary` auf `bg-amber-500/10 text-amber-500` ändern
- Spinner Farbe optional auf amber setzen

#### 1.2 `apps/ui/src/components/session-manager/orchestrator-run-header.tsx` (~10 Zeilen Änderung)

- Prüfen ob die Gruppen-Header auch einen Running-Indicator haben
- Falls eine Session in der Gruppe läuft, soll der Gruppen-Header das auch anzeigen

**Pseudo-Konzept:**

```
isRunning && !isCurrentSession → border-amber-500/70 + bg-amber-500/5
isRunning && isCurrentSession  → border-amber-500 + bg-amber-500/10
!isRunning && isCurrentSession → border-primary + bg-primary/10 (wie bisher)
!isRunning && !isCurrentSession → default (wie bisher)
```

---

### Phase 2: ✅ Multi-Session Parallelismus reparieren (~80 Zeilen)

**Was ändert sich?**
"New" klicken erstellt eine neue Session, ohne die alte zu stören. Der `isProcessing`-State wird beim Session-Wechsel korrekt zurückgesetzt.

**Was bedeutet das konkret für den User?**
Du klickst "New" während ein Chat arbeitet. Der neue Chat öffnet sich sofort und du kannst lostippen. Der alte Chat arbeitet im Hintergrund weiter.

**🔍 Root Cause Analyse:**

- **Betroffene Stelle:** `useElectronAgent` Hook (Zeile 270-331)
- **Grund:** Beim Session-Wechsel wird `isProcessing` nicht zurückgesetzt
- **Auswirkung:** `sendMessage()` prüft `if (isProcessing) return;` und verwirft Nachrichten still

**Betroffene Dateien:**

#### 2.1 `apps/ui/src/hooks/use-electron-agent.ts` (~50 Zeilen Änderung)

**Fix 1: State-Reset beim Session-Wechsel**

- Im Initialisierungs-Effect (Zeile 270): `setIsProcessing(false)` hinzufügen direkt nach `setIsConnected(false)`
- Das stellt sicher, dass der neue Chat sofort bereit ist für Nachrichten
- Danach setzt `getHistory()` den korrekten Wert vom Server

**Fix 2: `@ts-nocheck` entfernen**

- Die `@ts-nocheck` Direktive (Zeile 1) entfernen
- TypeScript-Fehler einzeln identifizieren und beheben
- Wahrscheinlich betrifft es die `api.agent!.onStream()` Callback-Typen
- Lösung: Explizite Type-Casts an den betroffenen Stellen

**Fix 3: Besserer Schutz gegen Message-Drop**

- In `sendMessage()`: Wenn `!isConnected`, statt still zu returnen, eine deutliche Meldung zeigen
- Optional: Kurz warten (200ms) wenn Session gerade wechselt, bevor Nachricht als "nicht möglich" gemeldet wird

#### 2.2 `apps/ui/src/components/views/agent-view.tsx` (~20 Zeilen Änderung)

**Fix 4: Klarere Trennung alte/neue Session**

- Optional: Beim Session-Wechsel den `input` State NICHT leeren (falls der User schon getippt hat)
- Der User soll seine angefangene Nachricht nicht verlieren beim Wechsel

---

## 📚 Lessons Learned & Regelverbesserung

### 🤔 Was hätte verhindert werden können?

Der `isProcessing` State-Reset-Bug hätte durch eine einfache Regel verhindert werden können:

**Neue Regel für `shared-docs/CODING-RULES.md`:**

> **Rule 3.6 (React State Reset bei dynamischen Keys):**
> Wenn ein Hook einen `useEffect` hat, der auf eine ID/Key-Prop reagiert (z.B. `sessionId`, `userId`), MUSS dieser Effect ALLE relevanten States zurücksetzen – nicht nur einige. Checkliste: `isLoading`, `isProcessing`, `isConnected`, `error`, `data`. Unvollständiger Reset führt zu "stale state" Bugs, bei denen Werte der alten Entität in der neuen Entität sichtbar sind.

---

## 🧩 Zusammenfassung

| Phase      | Was               | Dateien                                                | Zeilen          |
| ---------- | ----------------- | ------------------------------------------------------ | --------------- |
| Phase 1    | Gelber Rand       | `session-list-item.tsx`, `orchestrator-run-header.tsx` | ~60             |
| Phase 2    | Multi-Session Fix | `use-electron-agent.ts`, `agent-view.tsx`              | ~80             |
| **Gesamt** |                   | **4 Dateien**                                          | **~140 Zeilen** |

Keine neuen Dateien nötig. Keine Backend-Änderungen nötig (Server unterstützt Parallelismus bereits).
