---
name: lettre-client
description: Rédiger une lettre à un client en document Word (.docx) avec le modèle / en-tête de la fiduciaire, p. ex. demander des documents manquants, communiquer un délai, confirmer des honoraires. À utiliser pour « lettre au client … », « écrire à … », « avec notre modèle de lettre ».
---

# Lettre client

## Déroulement
1. **Rassembler le contexte**
   - Mémoire de l'entreprise (en bas du prompt système) : expéditeur, adresse, signature.
   - `search_documents` avec le nom du client + le sujet (p. ex. « Müller TVA documents »), lire les fichiers pertinents avec `read_document`.
   - Reprendre l'adresse du destinataire depuis les documents. Si elle manque, mettre « [adresse à compléter] » et le signaler.
2. **Choisir le modèle** : `list_templates`. Un modèle de l'utilisateur (source « workspace », p. ex. `Modeles/Modele_lettre.docx`) a priorité sur le `Modele_lettre.docx` fourni.
3. **Rédiger** – usages suisses romands :
   - `ORT_DATUM` : « Lausanne, le 24 octobre 2026 » (lieu du profil de l'entreprise, date du jour).
   - `BETREFF` : court et précis, p. ex. « Décompte TVA T4 2025 – documents manquants ».
   - `ANREDE` : « Monsieur, » / « Madame, » / « Madame, Monsieur, ».
   - Corps : courtois, clair, concis. Documents manquants en liste à puces, délai en gras (`**d'ici au 10 mars 2026**`).
   - `GRUSS` : « Nous vous prions d'agréer, Monsieur, nos salutations distinguées. » (adapter Madame/Monsieur). `SIGNATUR` : depuis la mémoire, sinon nom de l'entreprise.
4. **Créer** avec `create_docx` :
   - `template` : le modèle choisi
   - `fields` : FIRMA, ABSENDER_ADRESSE, FUSSZEILE, EMPFAENGER (plusieurs lignes avec `\n`), ORT_DATUM, BETREFF, ANREDE, GRUSS, SIGNATUR
   - `blocks` : le texte de la lettre (paragraph / bullets)
   - `path` : `Klienten/<dossier client>/Correspondance/<AAAA-MM-JJ>_Lettre_<sujet>.docx` (trouver le dossier client avec `glob`, sinon `Resultats/`).
   - Si l'outil renvoie `unfilled_placeholders`, compléter les champs (ou les mettre volontairement à `""`) et recréer.
5. Sur demande, PDF en plus avec `convert_to_pdf`.
6. **Conclusion** : chemin, résumé du contenu, points ouverts (p. ex. adresse manquante). Ne jamais envoyer la lettre soi-même.
