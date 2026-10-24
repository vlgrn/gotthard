---
name: bankauszuege-verbuchen
description: Bankauszüge oder Belege (PDF, CSV, Excel) auslesen, jede Transaktion einem Konto des Schweizer KMU-Kontenrahmens zuordnen und eine Excel-Zusammenfassung pro Konto erstellen. Verwenden bei «Transaktionen kategorisieren», «Bankauszüge verbuchen», «Kontierung», «Excel-Übersicht nach Konto».
---

# Bankauszüge verbuchen (KMU-Kontenrahmen)

## Ablauf
1. **Aufgabenliste** mit todowrite anlegen (ein Punkt pro Auszug + Kategorisieren + Excel + Kontrolle).
2. **Dateien finden**: die genannten Dateien oder mit `glob` z. B. `**/*Kontoauszug*.pdf`. Jede Datei mit `read_document` vollständig lesen.
3. **Transaktionen erfassen** – pro Zeile: Datum (TT.MM.JJJJ), Bank/Konto, Buchungstext, Betrag (Belastung negativ, Gutschrift positiv, als Zahl). Anfangs- und Schlusssaldo jedes Auszugs notieren.
4. **Kontieren** nach KMU-Kontenrahmen (vollständige Liste: `read_document` mit `kmu-kontenrahmen.csv`). Häufige Zuordnungen:
   | Buchungstext enthält | Konto |
   |---|---|
   | Miete, Dauerauftrag Immobilien | 6000 Raumaufwand |
   | Swisscom, Sunrise, Salt, Internet, Telefon, Porto, Post CH, Büromaterial | 6500 Verwaltungsaufwand |
   | Microsoft, Software, Lizenzen, Abacus, Bexio, Hosting | 6570 Informatikaufwand |
   | Versicherung (AXA, Mobiliar, Zurich, Helvetia), Gebühren | 6300 Sachversicherungen, Abgaben |
   | Strom, ewz, EKZ, BKW, Wasser | 6400 Energie |
   | SBB, GA, Halbtax, Benzin, Garage | 6200 Fahrzeug/Transport |
   | Google Ads, Inserat, Werbung | 6600 Werbeaufwand |
   | Lohn, Lohnzahlungen | 5000 Lohnaufwand |
   | AHV, SVA, Ausgleichskasse, BVG, Pensionskasse, UVG, Suva | 5700 Sozialversicherungsaufwand |
   | ESTV MWST | 2200 Geschuldete MWST |
   | Kontoführung, Spesen, Zinsbelastung | 6900 Finanzaufwand |
   | Zinsgutschrift | 6950 Finanzertrag |
   | Gutschrift / Zahlung eines Kunden | 1100 Debitoren (Zahlungseingang) |
   | Steueramt, direkte Steuern | 8900 Direkte Steuern |
   Wenn eine Zuordnung nicht eindeutig ist: bestes Konto wählen **und** in Spalte «Unsicher» «ja» mit kurzer Begründung.
5. **Excel erstellen** mit `create_xlsx`, Standardpfad `Ergebnisse/Kontierung_<Zeitraum>.xlsx` (oder vom Benutzer gewünscht):
   - Blatt «Transaktionen»: Datum | Bank | Buchungstext | Betrag | Konto | Kontobezeichnung | Unsicher | Quelle (Datei). `totals: ["D"]`.
   - Blatt «Zusammenfassung»: Konto | Kontobezeichnung | Anzahl | Summe. Summen als Formel, z. B. `=SUMIF(Transaktionen!E:E,A2,Transaktionen!D:D)` und `=COUNTIF(Transaktionen!E:E,A2)`. Konto als Zahl. `totals: ["D"]`.
   - Blatt «Kontrolle»: pro Auszug Datei | Anfangssaldo | Summe Transaktionen | Schlusssaldo laut Auszug | Differenz (Formel `=B2+C2-D2`).
6. **Kontrolle**: Anfangssaldo + Summe der Transaktionen muss den Schlusssaldo ergeben. Stimmt es nicht, die Auszüge erneut lesen und fehlende/doppelte Zeilen suchen. Differenzen im Ergebnis offen nennen.
7. **Abschluss**: Pfad der Excel-Datei, Anzahl Transaktionen, Total pro Konto (kurz), Liste der unsicheren Zuordnungen.

## Regeln
- Beträge immer als Zahl übergeben (-2850.0), nie als Text mit «CHF».
- Nichts erfinden: fehlt ein Betrag oder ist ein Scan unlesbar, als «unlesbar» markieren.
- MWST: Bei Belegen mit ausgewiesener MWST (8.1 % Normalsatz, 2.6 % reduziert, 3.8 % Beherbergung) den MWST-Betrag in einer zusätzlichen Spalte «MWST» festhalten, wenn ersichtlich.
