---
name: tri-courrier-entrant
description: Lire les documents scannés d'un dossier d'entrée (p. ex. /Eingang ou /Entrant), les attribuer au bon client, les renommer par date et type et les déplacer dans le dossier du client, avec un journal. À utiliser pour « trier le courrier entrant », « classer les scans », « renommer et ranger les fichiers ».
---

# Tri du courrier entrant

## Déroulement
1. **Inventaire** : lister le dossier d'entrée avec `list`/`glob`. Repérer les dossiers clients existants (p. ex. `Klienten/*` ou `Clients/*`). Liste de tâches avec todowrite.
2. **Lire chaque document** (`read_document`) et déterminer :
   - **Client** : destinataire, contribuable, employeur, titulaire du compte. Le faire correspondre à un dossier client existant (p. ex. « Müller AG » → `Klienten/Mueller_AG`).
   - **Date** du document (pas celle du scan) au format AAAA-MM-JJ.
   - **Type** : Facture, Rappel, Taxation, Declaration, Certificat_salaire, Releve, Attestation_interets, Contrat, Correspondance, TVA, Assurance, Divers.
   - **Expéditeur** (court, sans forme juridique, p. ex. « AFC », « Fisc_ZH », « Swisscom »).
3. **Présenter le plan** : tableau « fichier actuel → nouveau chemin ». Nouveau nom : `<AAAA-MM-JJ>_<Type>_<Expediteur>.<ext>`, sans accents ni espaces (é→e, ü→ue, espace→_). Dossier cible : `<dossier client>/` (sous-dossier seulement s'il existe déjà).
4. **Ne pas deviner** : client ou type incertain, ou scan illisible → déplacer vers `<dossier d'entrée>/_incertain/` et justifier.
5. **Déplacer** uniquement avec `move_file` (n'écrase jamais, journalise automatiquement). Ne pas créer de nouveau dossier client pour un nom inconnu – utiliser `_incertain`.
6. **Journal** en Markdown `<dossier d'entrée>/Journal_tri_<AAAA-MM-JJ>.md` (avec `write`) : tableau Original | Nouveau chemin | Client | Type | Date | Remarque.
7. **Conclusion** : nombre de fichiers déplacés, liste des documents incertains, renvoi au journal.
