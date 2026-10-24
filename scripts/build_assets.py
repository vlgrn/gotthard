from __future__ import annotations

import sys
from pathlib import Path

import docx
import openpyxl
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Mm, Pt, RGBColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "packages" / "gotthard-skills" / "templates"


def build_letter(path: Path, lang: str) -> None:
    d = docx.Document()
    sec = d.sections[0]
    sec.page_height, sec.page_width = Mm(297), Mm(210)
    sec.left_margin, sec.right_margin, sec.top_margin, sec.bottom_margin = Mm(25), Mm(20), Mm(20), Mm(20)
    style = d.styles["Normal"]
    style.font.name = "Arial"
    style.font.size = Pt(10.5)

    head = sec.header.paragraphs[0]
    r = head.add_run("{{FIRMA}}")
    r.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F)
    head.add_run("\n{{ABSENDER_ADRESSE}}").font.size = Pt(8.5)
    foot = sec.footer.paragraphs[0]
    foot.alignment = WD_ALIGN_PARAGRAPH.CENTER
    foot.add_run("{{FUSSZEILE}}").font.size = Pt(8)

    d.add_paragraph().paragraph_format.space_after = Mm(18)
    d.add_paragraph("{{EMPFAENGER}}")
    p = d.add_paragraph("{{ORT_DATUM}}")
    p.paragraph_format.space_before = Mm(12)
    p.paragraph_format.space_after = Mm(8)
    p = d.add_paragraph()
    p.add_run("{{BETREFF}}").bold = True
    p.paragraph_format.space_after = Mm(6)
    d.add_paragraph("{{ANREDE}}")
    d.add_paragraph("{{INHALT}}")
    p = d.add_paragraph("{{GRUSS}}")
    p.paragraph_format.space_before = Mm(6)
    p = d.add_paragraph("{{SIGNATUR}}")
    p.paragraph_format.space_before = Mm(14)
    d.core_properties.title = "Briefvorlage" if lang == "de" else "Modèle de lettre"
    d.save(path)


KMU_ACCOUNTS = [
    ("1000", "Kasse", "Caisse"),
    ("1020", "Bankguthaben", "Avoirs bancaires"),
    ("1100", "Forderungen aus Lieferungen und Leistungen (Debitoren)", "Créances résultant de livraisons et prestations (débiteurs)"),
    ("1170", "Vorsteuer MWST Material, Waren, Dienstleistungen, Energie", "Impôt préalable TVA sur matériel, marchandises, prestations, énergie"),
    ("1171", "Vorsteuer MWST Investitionen, übriger Betriebsaufwand", "Impôt préalable TVA sur investissements, autres charges"),
    ("1300", "Aktive Rechnungsabgrenzungen", "Actifs de régularisation"),
    ("1500", "Maschinen und Apparate", "Machines et appareils"),
    ("1510", "Mobiliar und Einrichtungen", "Mobilier et installations"),
    ("1520", "Büromaschinen, Informatik", "Machines de bureau, informatique"),
    ("1530", "Fahrzeuge", "Véhicules"),
    ("2000", "Verbindlichkeiten aus Lieferungen und Leistungen (Kreditoren)", "Dettes résultant d'achats et prestations (créanciers)"),
    ("2200", "Geschuldete MWST (Umsatzsteuer)", "TVA due"),
    ("2270", "Verbindlichkeiten Sozialversicherungen", "Dettes envers assurances sociales"),
    ("2300", "Passive Rechnungsabgrenzungen", "Passifs de régularisation"),
    ("2800", "Grund-, Gesellschafter- oder Stammkapital", "Capital-actions, capital social"),
    ("3200", "Handelserlöse", "Ventes de marchandises"),
    ("3400", "Dienstleistungserlöse", "Produits des prestations de services"),
    ("3800", "Erlösminderungen", "Déductions sur les ventes"),
    ("4000", "Materialaufwand", "Charges de matériel"),
    ("4200", "Handelswarenaufwand", "Achats de marchandises"),
    ("5000", "Lohnaufwand", "Salaires"),
    ("5700", "Sozialversicherungsaufwand (AHV, IV, EO, ALV, BVG, UVG)", "Charges sociales (AVS, AI, APG, AC, LPP, LAA)"),
    ("5800", "Übriger Personalaufwand", "Autres charges de personnel"),
    ("6000", "Raumaufwand (Miete)", "Charges de locaux (loyer)"),
    ("6100", "Unterhalt, Reparaturen, Ersatz", "Entretien, réparations, remplacement"),
    ("6200", "Fahrzeug- und Transportaufwand", "Charges de véhicules et de transport"),
    ("6300", "Sachversicherungen, Abgaben, Gebühren", "Assurances-choses, droits, taxes"),
    ("6400", "Energie- und Entsorgungsaufwand", "Charges d'énergie et d'évacuation"),
    ("6500", "Verwaltungsaufwand (Büromaterial, Porti, Telefon, Treuhand)", "Charges d'administration (fournitures, port, téléphone, fiduciaire)"),
    ("6570", "Informatikaufwand inkl. Leasing", "Charges informatiques y.c. leasing"),
    ("6600", "Werbeaufwand", "Publicité"),
    ("6700", "Sonstiger betrieblicher Aufwand", "Autres charges d'exploitation"),
    ("6800", "Abschreibungen", "Amortissements"),
    ("6900", "Finanzaufwand (Zinsen, Bankspesen)", "Charges financières (intérêts, frais bancaires)"),
    ("6950", "Finanzertrag", "Produits financiers"),
    ("8900", "Direkte Steuern", "Impôts directs"),
]


def build_templates() -> None:
    TEMPLATES.mkdir(parents=True, exist_ok=True)
    build_letter(TEMPLATES / "Briefvorlage.docx", "de")
    build_letter(TEMPLATES / "Modele_lettre.docx", "fr")
    with open(TEMPLATES / "kmu-kontenrahmen.csv", "w", encoding="utf-8") as f:
        f.write("Konto;Bezeichnung;Désignation\n")
        for nr, de, fr in KMU_ACCOUNTS:
            f.write(f"{nr};{de};{fr}\n")
    print("templates written to", TEMPLATES)


BANK = {
    "Bankauszuege/UBS_Kontoauszug_2026-01.pdf": ("UBS Switzerland AG", "CH93 0027 3273 1234 5678 9", "Januar 2026", 48210.35, [
        ("03.01.2026", "Dauerauftrag Immobilien Zürich AG Miete Büro Januar", -2850.00),
        ("05.01.2026", "Swisscom (Schweiz) AG Rechnung Internet/Telefon", -189.90),
        ("08.01.2026", "Gutschrift Müller AG Rechnung 2025-118", 4320.00),
        ("10.01.2026", "AXA Versicherungen AG Betriebshaftpflicht 2026", -1240.00),
        ("15.01.2026", "Gutschrift Keller GmbH Akonto Abschluss 2025", 1200.00),
        ("20.01.2026", "Office World Büromaterial", -312.45),
        ("25.01.2026", "Lohnzahlungen Januar", -18450.00),
        ("26.01.2026", "SVA Zürich AHV/IV/EO Akonto Q1", -3820.60),
        ("28.01.2026", "Microsoft Ireland Operations M365 Lizenzen", -264.00),
        ("31.01.2026", "Kontoführungsgebühren", -15.00),
    ]),
    "Bankauszuege/UBS_Kontoauszug_2026-02.pdf": ("UBS Switzerland AG", "CH93 0027 3273 1234 5678 9", "Februar 2026", 26588.40, [
        ("02.02.2026", "Dauerauftrag Immobilien Zürich AG Miete Büro Februar", -2850.00),
        ("04.02.2026", "Gutschrift Bäckerei Huber Rechnung 2026-004", 1850.00),
        ("06.02.2026", "ewz Elektrizitätswerk Zürich Strom", -142.30),
        ("12.02.2026", "SBB Mobile GA Geschäft", -3995.00),
        ("18.02.2026", "Gutschrift Müller AG Rechnung 2026-009", 2700.00),
        ("25.02.2026", "Lohnzahlungen Februar", -18450.00),
        ("27.02.2026", "ESTV MWST Abrechnung Q4 2025", -4120.55),
        ("28.02.2026", "Kontoführungsgebühren", -15.00),
    ]),
    "Bankauszuege/PostFinance_Kontoauszug_2026-01.pdf": ("PostFinance AG", "CH44 0900 0000 8765 4321 0", "Januar 2026", 9120.00, [
        ("04.01.2026", "Gutschrift Treuhand-Mandat Garage Brunner", 980.00),
        ("09.01.2026", "Post CH AG Porto Frankiermaschine", -120.00),
        ("14.01.2026", "Google Ireland Ltd Google Ads", -250.00),
        ("21.01.2026", "Abacus Research AG Software-Wartung", -780.00),
        ("30.01.2026", "Zinsgutschrift", 1.20),
        ("31.01.2026", "Kontoführungsgebühren PostFinance", -5.00),
    ]),
}

SCANS = [
    ("Eingang/scan_0001.pdf", ["Steueramt des Kantons Zürich", "Definitive Veranlagung Staats- und Gemeindesteuern 2024",
     "Steuerpflichtige: Müller AG, Bahnhofstrasse 12, 8001 Zürich", "Datum: 14.02.2026",
     "Steuerbares Einkommen/Gewinn: CHF 182'400", "Zu bezahlen bis 31.03.2026: CHF 21'930.40"]),
    ("Eingang/scan_0002.pdf", ["Keller GmbH, Seestrasse 4, 8810 Horgen", "Lohnausweis 2025 – Formular 11",
     "Arbeitnehmerin: Anna Keller", "Bruttolohn: CHF 96'000", "Datum: 20.01.2026"]),
    ("Eingang/scan_0003.pdf", ["Holzbau Gerber AG, 8400 Winterthur", "RECHNUNG Nr. 2026-0311", "Datum: 03.02.2026",
     "An: Bäckerei Huber, Dorfstrasse 8, 8606 Greifensee", "Reparatur Ladeneinrichtung CHF 2'150.00",
     "MWST 8.1 % CHF 174.15", "Total CHF 2'324.15", "Zahlbar innert 30 Tagen"]),
    ("Eingang/scan_0004.pdf", ["Eidgenössische Steuerverwaltung ESTV", "Mahnung MWST-Abrechnung Q4 2025",
     "MWST-Nr. CHE-123.456.789 MWST – Müller AG", "Datum: 18.02.2026",
     "Die Abrechnung für das 4. Quartal 2025 ist ausstehend. Frist: 10.03.2026"]),
    ("Eingang/scan_0005.pdf", ["UBS Switzerland AG", "Zinsausweis / Kontoauszug per 31.12.2025",
     "Kontoinhaberin: Keller GmbH", "Saldo per 31.12.2025: CHF 64'210.85", "Datum: 05.01.2026"]),
    ("Eingang/scan_0006.pdf", ["Swisscom (Schweiz) AG", "Rechnung Januar 2026", "Kunde: Bäckerei Huber",
     "Datum: 12.01.2026", "Internet Business CHF 89.00, Mobile CHF 64.00", "Total inkl. MWST CHF 153.00"]),
]


def demo(target: Path) -> None:
    target.mkdir(parents=True, exist_ok=True)

    for rel_path, (bank, iban, period, opening, rows) in BANK.items():
        p = target / rel_path
        p.parent.mkdir(parents=True, exist_ok=True)
        c = canvas.Canvas(str(p), pagesize=A4)
        w, h = A4
        y = h - 20 * mm
        c.setFont("Helvetica-Bold", 14)
        c.drawString(20 * mm, y, bank)
        y -= 7 * mm
        c.setFont("Helvetica", 10)
        c.drawString(20 * mm, y, f"Kontoauszug {period}  ·  Kontoinhaber: Treuhand Beispiel GmbH  ·  IBAN {iban}")
        y -= 10 * mm
        c.setFont("Helvetica-Bold", 9)
        for x, t in ((20, "Datum"), (45, "Buchungstext"), (140, "Belastung"), (162, "Gutschrift"), (184, "Saldo")):
            c.drawString(x * mm, y, t)
        y -= 6 * mm
        c.setFont("Helvetica", 9)
        bal = opening
        c.drawString(45 * mm, y, "Anfangssaldo")
        c.drawRightString(200 * mm, y, chf(bal))
        y -= 5 * mm
        for date, text, amount in rows:
            bal += amount
            c.drawString(20 * mm, y, date)
            c.drawString(45 * mm, y, text[:58])
            if amount < 0:
                c.drawRightString(158 * mm, y, chf(-amount))
            else:
                c.drawRightString(180 * mm, y, chf(amount))
            c.drawRightString(200 * mm, y, chf(bal))
            y -= 5 * mm
        c.setFont("Helvetica-Bold", 9)
        c.drawString(45 * mm, y - 2 * mm, "Schlusssaldo")
        c.drawRightString(200 * mm, y - 2 * mm, chf(bal))
        c.save()

    for rel_path, lines in SCANS:
        p = target / rel_path
        p.parent.mkdir(parents=True, exist_ok=True)
        c = canvas.Canvas(str(p), pagesize=A4)
        y = A4[1] - 25 * mm
        for i, line in enumerate(lines):
            c.setFont("Helvetica-Bold" if i < 2 else "Helvetica", 12 if i < 2 else 10)
            c.drawString(22 * mm, y, line)
            y -= 9 * mm
        c.save()

    k = target / "Klienten"
    for d in ("Mueller_AG", "Keller_GmbH", "Baeckerei_Huber"):
        (k / d).mkdir(parents=True, exist_ok=True)
    (k / "Keller_GmbH" / "Korrespondenz").mkdir(exist_ok=True)
    (k / "Keller_GmbH" / "Korrespondenz" / "2026-03-12_Mail_Honorar_Abschluss.txt").write_text(
        "Von: Peter Keller <p.keller@keller-gmbh.ch>\n"
        "An: Sandra Meier <s.meier@treuhand-beispiel.ch>\n"
        "Datum: 12.03.2026\n"
        "Betreff: AW: Offerte Jahresabschluss 2025\n\n"
        "Guten Tag Frau Meier\n\n"
        "Besten Dank für die Offerte. Wir sind mit dem vorgeschlagenen Pauschalhonorar von CHF 2'400 (exkl. MWST) "
        "für den Jahresabschluss 2025 inkl. Steuererklärung einverstanden. Zusatzaufwand für die Lohnbuchhaltung "
        "wird wie besprochen nach Aufwand zu CHF 140/Std. verrechnet. Die Akontozahlung von CHF 1'200 erfolgt im Januar.\n\n"
        "Freundliche Grüsse\nPeter Keller\nKeller GmbH, Seestrasse 4, 8810 Horgen\n",
        encoding="utf-8",
    )
    nd = docx.Document()
    nd.add_heading("Müller AG – Aktennotiz MWST", 1)
    nd.add_paragraph("Telefonat mit Herrn Thomas Müller am 16.02.2026.")
    nd.add_paragraph("Für die MWST-Abrechnung Q4 2025 fehlen uns noch folgende Unterlagen:")
    for t in ("Lieferantenrechnungen Oktober–Dezember 2025 (Vorsteuerbelege)", "Kassabuch Dezember 2025",
              "Kreditkartenabrechnungen November und Dezember 2025", "Ausgangsrechnungen Nr. 2025-101 bis 2025-125"):
        nd.add_paragraph(t, style="List Bullet")
    nd.add_paragraph("Frist ESTV: 10.03.2026. Herr Müller bevorzugt Kommunikation per Brief an die Geschäftsadresse "
                     "Müller AG, Herr Thomas Müller, Bahnhofstrasse 12, 8001 Zürich.")
    nd.save(k / "Mueller_AG" / "Aktennotiz_MWST_2026-02-16.docx")

    ab = k / "Mueller_AG" / "Abschluss_2025"
    ab.mkdir(exist_ok=True)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Bilanz"
    for row in [("Konto", "Bezeichnung", "31.12.2025"), (1020, "Bank UBS", 84210.40), (1100, "Debitoren", 23400.00),
                (1510, "Mobiliar", 12000.00), (2000, "Kreditoren", -18750.30), (2800, "Aktienkapital", -100000.00)]:
        ws.append(row)
    wb.save(ab / "Bilanz_Entwurf_2025.xlsx")
    (ab / "Inventarliste_2025.csv").write_text("Artikel;Menge;Wert CHF\nBüromöbel;6;12000\nLaptops;4;6400\n", encoding="utf-8")
    (ab / "Debitorenliste_31.12.2025.txt").write_text(
        "Offene Debitoren per 31.12.2025\nKunde A 12'400.00\nKunde B 11'000.00\nTotal 23'400.00\n", encoding="utf-8")
    (k / "Baeckerei_Huber" / "Stammdaten.md").write_text(
        "# Bäckerei Huber\n- Inhaber: Markus Huber\n- Adresse: Dorfstrasse 8, 8606 Greifensee\n- MWST: effektive Methode, quartalsweise\n"
        "- Mandat: Buchhaltung, MWST, Löhne (3 Mitarbeitende)\n", encoding="utf-8")
    (target / "Vorlagen").mkdir(exist_ok=True)
    (target / "Vorlagen" / "LIESMICH.txt").write_text(
        "Legen Sie hier Ihre eigenen Vorlagen ab (z. B. Briefvorlage.docx mit Ihrem Briefkopf).\n"
        "Gotthard verwendet Vorlagen in diesem Ordner vor den mitgelieferten.\n", encoding="utf-8")
    print("demo workspace written to", target)


def chf(v: float) -> str:
    s = f"{v:,.2f}"
    return s.replace(",", "'")


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "templates":
        build_templates()
    elif len(sys.argv) >= 3 and sys.argv[1] == "demo":
        demo(Path(sys.argv[2]).expanduser().resolve())
    else:
        raise SystemExit("usage: build_assets.py templates | demo <target-dir>")
