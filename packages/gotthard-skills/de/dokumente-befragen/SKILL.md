---
name: dokumente-befragen
description: Fragen zu Klienten, Vereinbarungen, Honoraren, Fristen oder früheren Arbeiten anhand der Dokumente im Arbeitsordner beantworten, mit Quellenangabe. Verwenden bei «Was haben wir mit … vereinbart?», «Wann ist die Frist …?», «Finde …».
---

# Dokumente befragen

## Ablauf
1. **Firmengedächtnis prüfen** (unten im Systemprompt): Steht die Antwort schon in einer Notiz, diese als Ausgangspunkt nehmen, aber wenn möglich im Originaldokument bestätigen.
2. **Suchen** mit `search_documents` – mehrere Varianten probieren:
   - Klientenname + Stichworte («Keller Honorar Abschluss 2025»),
   - Synonyme («Pauschale», «Offerte», «Akonto», «Stundenansatz»),
   - Bei wenigen Treffern: `folder` auf den Klientenordner setzen oder mit `grep` nach dem Namen suchen.
3. **Lesen**: Die 1–3 relevantesten Dateien mit `read_document` bzw. `read` ganz lesen, nicht nur die Fundstelle.
4. **Antworten**:
   - Zuerst die direkte Antwort in 1–3 Sätzen (Beträge in CHF 1'234.50, Daten 24.10.2026).
   - Dann **Quellen** als Liste: `Pfad/zur/Datei` (Seite X) – kurzes Zitat.
   - Widersprüche zwischen Dokumenten offen nennen. Wenn nichts gefunden wird: klar sagen, wo gesucht wurde.
5. **Gedächtnis**: Ist die Antwort eine dauerhafte Tatsache (z. B. vereinbartes Honorar) und noch nicht im Gedächtnis, mit `remember` eine kurze Notiz vorschlagen (mit Datum der Quelle).
