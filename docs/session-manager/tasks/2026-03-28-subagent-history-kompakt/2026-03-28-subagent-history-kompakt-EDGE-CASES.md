# 2026-03-28 Sub-Agent-History kompakter (EDGE-CASES)

## Edge Cases + Gegenmaßnahme

1. Alt-Daten ohne `sourceType`, aber mit `parentToolUseId`.

- Maßnahme: Als Sub-Agent behandeln.

2. Manuelle Child-Sessions (`parentSessionId`, aber `sourceType: manual`).

- Maßnahme: Nicht automatisch wie Sub-Agent behandeln.

3. Sub-Agent-Session hat später doch Nachrichten.

- Maßnahme: Nur leere Sub-Agent-Items sind nicht klickbar; mit Nachrichten bleibt Klick möglich.

4. Sub-Agent läuft noch (`running`) und ist leer.

- Maßnahme: Weiter kompakt zeigen, aber klar als Lauf markieren.

5. Archivierte Sub-Agent-Session.

- Maßnahme: Gleiches Regelwerk wie aktiv, nur Archiv-Aktionen bleiben erhalten.

6. Sehr kleine Schriftgröße.

- Maßnahme: Mindestgrößen (`Math.max`) beibehalten, damit Lesbarkeit stabil bleibt.
