---
name: eingang-sortieren
description: Gescannte Dokumente in einem Eingangsordner (z. B. /Eingang) lesen, dem richtigen Klienten zuordnen und nach Datum und Dokumenttyp umbenennen und in den Klientenordner verschieben, mit Protokoll. Verwenden bei «Eingang sortieren», «Scans ablegen», «Dateien umbenennen und einordnen».
---

# Eingang sortieren

## Ablauf
1. **Bestandsaufnahme**: Eingangsordner mit `list`/`glob` auflisten. Bestehende Klientenordner suchen (z. B. `Klienten/*`). Aufgabenliste mit todowrite anlegen.
2. **Jedes Dokument lesen** (`read_document`) und bestimmen:
   - **Klient**: Name des Klienten (Empfänger, Steuerpflichtige, Arbeitgeber, Kontoinhaber). Mit den vorhandenen Klientenordnern abgleichen (z. B. «Müller AG» → `Klienten/Mueller_AG`).
   - **Datum** des Dokuments (nicht das Scan-Datum) im Format JJJJ-MM-TT.
   - **Typ**: Rechnung, Mahnung, Steuerveranlagung, Steuererklärung, Lohnausweis, Kontoauszug, Zinsausweis, Vertrag, Korrespondenz, MWST, Versicherung, Sonstiges.
   - **Absender** (kurz, ohne Rechtsform-Zusatz, z. B. «ESTV», «Steueramt_ZH», «Swisscom»).
3. **Plan zeigen**: Tabelle «aktuelle Datei → neuer Pfad». Neuer Name: `<JJJJ-MM-TT>_<Typ>_<Absender>.<Endung>`, ohne Umlaute und Leerzeichen (ä→ae, ö→oe, ü→ue, Leerzeichen→_). Zielordner: `Klienten/<Klientenordner>/` (Unterordner nur, wenn bereits vorhanden, z. B. `Korrespondenz`).
4. **Unklare Dokumente nicht raten**: Ist Klient oder Typ unsicher oder ist der Scan unlesbar → nach `Eingang/_unklar/` verschieben und begründen.
5. **Verschieben** ausschliesslich mit `move_file` (überschreibt nie, protokolliert automatisch). Keinen neuen Klientenordner für unbekannte Namen anlegen – stattdessen `_unklar`.
6. **Protokoll** als Markdown-Datei `Eingang/Sortierprotokoll_<JJJJ-MM-TT>.md` (mit `write`): Tabelle Original | Neuer Pfad | Klient | Typ | Datum | Bemerkung.
7. **Abschluss**: Anzahl verschobener Dateien, Liste der unklaren Dokumente, Hinweis auf das Protokoll.
