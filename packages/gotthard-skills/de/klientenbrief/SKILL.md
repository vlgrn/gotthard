---
name: klientenbrief
description: Einen Brief an einen Klienten als Word-Dokument (.docx) mit Briefvorlage/Briefkopf verfassen, z. B. fehlende Unterlagen anfordern, Fristen mitteilen, Honorar bestätigen. Verwenden bei «Brief an Klient …», «Schreiben an …», «Brief mit unserer Vorlage».
---

# Klientenbrief

## Ablauf
1. **Kontext sammeln**
   - Firmengedächtnis (unten im Systemprompt) für Absender, Adresse und Signatur.
   - `search_documents` mit Klientenname + Thema (z. B. «Müller MWST Unterlagen»), relevante Dateien mit `read_document` lesen.
   - Empfängeradresse aus den Dokumenten übernehmen. Fehlt sie, Platzhalter «[Adresse ergänzen]» einsetzen und am Schluss darauf hinweisen.
2. **Vorlage wählen**: `list_templates`. Eine Vorlage des Benutzers (Quelle «workspace», z. B. `Vorlagen/Briefvorlage.docx`) hat Vorrang vor der mitgelieferten `Briefvorlage.docx`.
3. **Brief schreiben** – Schweizer Konventionen:
   - `ORT_DATUM`: «Zürich, 24. Oktober 2026» (Ort aus dem Firmenprofil, heutiges Datum).
   - `BETREFF`: kurz und konkret, z. B. «MWST-Abrechnung Q4 2025 – fehlende Unterlagen».
   - `ANREDE`: «Sehr geehrter Herr Müller» / «Sehr geehrte Frau Keller» / «Sehr geehrte Damen und Herren» (ohne Komma; der Text beginnt mit Grossbuchstaben).
   - Inhalt: höflich, klar, kurz. Fehlende Unterlagen als Aufzählung, Frist fett (`**bis 10. März 2026**`).
   - `GRUSS`: «Freundliche Grüsse». `SIGNATUR`: aus dem Firmengedächtnis, sonst Firmenname.
   - Immer «ss» statt «ß».
4. **Erstellen** mit `create_docx`:
   - `template`: gewählte Vorlage
   - `fields`: FIRMA, ABSENDER_ADRESSE, FUSSZEILE, EMPFAENGER (mehrzeilig mit `\n`), ORT_DATUM, BETREFF, ANREDE, GRUSS, SIGNATUR
   - `blocks`: der Brieftext (paragraph / bullets)
   - `path`: `Klienten/<Klientenordner>/Korrespondenz/<JJJJ-MM-TT>_Brief_<Kurzthema>.docx` (Klientenordner mit `glob` suchen; sonst `Ergebnisse/`).
   - Meldet das Tool `unfilled_placeholders`, die Felder ergänzen (oder bewusst leer `""` setzen) und neu erstellen.
5. Auf Wunsch zusätzlich PDF mit `convert_to_pdf`.
6. **Abschluss**: Pfad, kurze Zusammenfassung des Inhalts, offene Punkte (z. B. fehlende Adresse). Den Brief nie selbst versenden.
