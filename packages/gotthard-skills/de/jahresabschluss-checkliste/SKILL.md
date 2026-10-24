---
name: jahresabschluss-checkliste
description: Die Jahresabschluss-Checkliste für einen Klienten durchgehen, vorhandene Unterlagen im Klientenordner prüfen und auflisten, was fehlt (Bericht als .md und .xlsx). Verwenden bei «Jahresabschluss-Checkliste», «Was fehlt für den Abschluss», «Abschlussunterlagen prüfen».
---

# Jahresabschluss-Checkliste

## Ablauf
1. **Klient und Jahr bestimmen** (aus der Anfrage; Jahr standardmässig das Vorjahr). Klientenordner mit `glob` finden (z. B. `Klienten/*Mueller*/**/*`). Auch `Eingang/` und `Bankauszuege/` berücksichtigen.
2. **Alle Dateien des Klienten auflisten** und die relevanten mit `read_document` lesen (bei vielen Dateien zuerst Dateinamen auswerten, dann gezielt lesen). Zusätzlich `search_documents` mit Klientenname + Stichwort.
3. **Checkliste prüfen** – für jeden Punkt Status «vorhanden», «fehlt» oder «unklar/teilweise», mit Fundstelle:
   1. Bankauszüge / Saldobestätigungen per 31.12. (alle Konten)
   2. Kassabuch und Kassenbestand per 31.12.
   3. Debitorenliste per 31.12.
   4. Kreditorenliste per 31.12.
   5. Inventar / Warenlager per 31.12.
   6. Anlagenverzeichnis, Rechnungen für Investitionen
   7. Darlehensverträge, Zinsausweise
   8. Lohnjournal, Lohnausweise, AHV-Lohndeklaration
   9. BVG-, UVG-, KTG-Abrechnungen
   10. MWST-Abrechnungen Q1–Q4 und Umsatzabstimmung
   11. Versicherungspolicen und Prämienrechnungen
   12. Miet- und Leasingverträge
   13. Wertschriften-/Depotauszüge
   14. Privatanteile (Fahrzeug, Telefon) und Spesenreglement
   15. Abgrenzungen und Rückstellungen (offene Rechnungen, Ferienguthaben)
   16. Steuerveranlagungen und -rechnungen
   17. Protokoll der letzten GV / Gesellschafterversammlung (Gewinnverwendung)
   18. Entwurf Bilanz und Erfolgsrechnung
   Hinweise in Dokumenten (z. B. Mahnungen, Aktennotizen über fehlende Unterlagen) ausdrücklich berücksichtigen.
4. **Bericht erstellen**:
   - Markdown `Klienten/<Ordner>/Abschluss_<Jahr>/Checkliste_<JJJJ-MM-TT>.md` (mit `write`): Kopf (Klient, Jahr, Datum), Tabelle Nr | Punkt | Status | Fundstelle/Bemerkung, danach Abschnitt «Fehlende Unterlagen» als Liste und «Fristen» (falls gefunden).
   - Excel gleicher Name `.xlsx` mit `create_xlsx` (Blatt «Checkliste», gleiche Spalten).
5. **Abschluss**: Anzahl vorhanden / fehlt / unklar, die wichtigsten fehlenden Unterlagen, Fristen. Anbieten, mit dem Skill «klientenbrief» einen Brief zur Anforderung der fehlenden Unterlagen zu erstellen.

## Regeln
- «vorhanden» nur, wenn ein Dokument tatsächlich gefunden wurde – Fundstelle immer angeben.
- Punkte, die für den Klienten offensichtlich nicht zutreffen (z. B. kein Personal), als «n/a» markieren und begründen.
