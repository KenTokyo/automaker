## Sound-Signale (Console Beep)

Das Skript gibt akustische Signale, damit der User weiss, wann Aufmerksamkeit noetig ist.

### Befehle

```bash
# Erfolg-Signal (4x aufsteigend): Lauf komplett oder Phase erfolgreich abgeschlossen
powershell -Command "[console]::beep(600,150); Start-Sleep -Milliseconds 80; [console]::beep(800,150); Start-Sleep -Milliseconds 80; [console]::beep(1000,150); Start-Sleep -Milliseconds 80; [console]::beep(1200,300)"

# Blocker-Signal (4x absteigend): Manuelle Aktion noetig oder Fehler
powershell -Command "[console]::beep(1000,200); Start-Sleep -Milliseconds 100; [console]::beep(800,200); Start-Sleep -Milliseconds 100; [console]::beep(600,200); Start-Sleep -Milliseconds 100; [console]::beep(400,400)"
```

**Maximal 700 Zeilen Code pro Datei** - Teile/Auslagern in unterkomponenten in (Ordnern)/in helpers/services/compontens wenn größer

Erzeuge GIT COMMIT Messages und commite die changes dann, wenn alle phasen und typescript fehler beohben sind, kein npm run build oder npm run dev, es reicht die typescript fehler zu erkennen
