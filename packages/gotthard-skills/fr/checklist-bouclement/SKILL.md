---
name: checklist-bouclement
description: Parcourir la checklist de bouclement annuel d'un client, vérifier les documents présents dans son dossier et lister ce qui manque (rapport .md et .xlsx). À utiliser pour « checklist de bouclement », « que manque-t-il pour le bouclement », « vérifier les pièces de clôture ».
---

# Checklist de bouclement annuel

## Déroulement
1. **Déterminer le client et l'exercice** (d'après la demande ; par défaut l'année précédente). Trouver le dossier client avec `glob` (p. ex. `Klienten/*Mueller*/**/*`). Tenir compte aussi du dossier d'entrée et des relevés bancaires.
2. **Lister tous les fichiers du client** et lire les pertinents avec `read_document` (si nombreux : d'abord analyser les noms, puis lire de manière ciblée). En plus, `search_documents` avec le nom du client + mot-clé.
3. **Vérifier la checklist** – pour chaque point, statut « présent », « manquant » ou « incertain/partiel », avec la source :
   1. Relevés bancaires / confirmations de solde au 31.12 (tous les comptes)
   2. Livre de caisse et solde de caisse au 31.12
   3. Liste des débiteurs au 31.12
   4. Liste des créanciers au 31.12
   5. Inventaire / stock au 31.12
   6. Tableau des immobilisations, factures d'investissements
   7. Contrats de prêt, attestations d'intérêts
   8. Journal des salaires, certificats de salaire, déclaration des salaires AVS
   9. Décomptes LPP, LAA, IJM
   10. Décomptes TVA T1–T4 et concordance du chiffre d'affaires
   11. Polices d'assurance et factures de primes
   12. Contrats de bail et de leasing
   13. Relevés de titres / de dépôt
   14. Parts privées (véhicule, téléphone) et règlement de frais
   15. Régularisations et provisions (factures ouvertes, vacances dues)
   16. Taxations et bordereaux d'impôts
   17. Procès-verbal de la dernière AG / assemblée des associés (emploi du bénéfice)
   18. Projet de bilan et de compte de résultat
   Tenir compte explicitement des indications dans les documents (rappels, notes de dossier sur des pièces manquantes).
4. **Rapport** :
   - Markdown `<dossier client>/Abschluss_<annee>/Checklist_<AAAA-MM-JJ>.md` (avec `write`) : en-tête (client, exercice, date), tableau N° | Point | Statut | Source/Remarque, puis « Documents manquants » en liste et « Délais » (si trouvés).
   - Excel du même nom en `.xlsx` avec `create_xlsx` (feuille « Checklist », mêmes colonnes).
5. **Conclusion** : nombre présent / manquant / incertain, principaux documents manquants, délais. Proposer de rédiger une lettre de demande avec la compétence « lettre-client ».

## Règles
- « présent » uniquement si un document a réellement été trouvé – toujours indiquer la source.
- Points manifestement sans objet (p. ex. pas de personnel) : « n/a » avec justification.
