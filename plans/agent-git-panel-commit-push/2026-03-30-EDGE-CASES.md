# Agent Git Panel Commit Push - Edge Cases

1. Repo ist kein Git-Repo -> alle Git-Aktionen deaktiviert mit klarer Meldung.
2. Repo hat noch keine Commits -> Commit/Push/Pull korrekt behandeln.
3. Keine lokalen Aenderungen -> Commit meldet "No changes to commit".
4. Pull mit lokalen Aenderungen -> sauberer Fehlerhinweis.
5. Push ohne Upstream -> Fallback ueber `-u` / `--set-upstream`.
6. Auto-Commit-Message scheitert -> manuelle Eingabe bleibt moeglich.
7. Right Panel war geschlossen -> Actions oeffnen Panel automatisch.
8. Sehr grosse Diff-Menge -> Dateiliste bleibt nutzbar, keine UI-Haenger.
9. Board-View darf unveraendert funktionieren (Dialoge dort bleiben intakt).
