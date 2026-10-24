---
name: releves-bancaires
description: Lire des relevés bancaires ou des justificatifs (PDF, CSV, Excel), attribuer chaque transaction à un compte du plan comptable suisse PME et produire un récapitulatif Excel par compte. À utiliser pour « catégoriser les transactions », « comptabiliser les relevés », « imputation », « récapitulatif Excel par compte ».
---

# Comptabiliser des relevés bancaires (plan comptable PME)

## Déroulement
1. **Liste de tâches** avec todowrite (un point par relevé + imputation + Excel + contrôle).
2. **Trouver les fichiers** : ceux indiqués ou avec `glob`, p. ex. `**/*releve*.pdf`, `**/*Kontoauszug*.pdf`. Lire chaque fichier en entier avec `read_document`.
3. **Relever les transactions** – par ligne : date (JJ.MM.AAAA), banque/compte, libellé, montant (débit négatif, crédit positif, en nombre). Noter le solde initial et final de chaque relevé.
4. **Imputer** selon le plan comptable PME (liste complète : `read_document` avec `kmu-kontenrahmen.csv`, colonne « Désignation »). Correspondances fréquentes :
   | Le libellé contient | Compte |
   |---|---|
   | loyer, ordre permanent immobilier | 6000 Charges de locaux |
   | Swisscom, Sunrise, Salt, internet, téléphone, port, La Poste, fournitures | 6500 Charges d'administration |
   | Microsoft, logiciel, licences, Abacus, Bexio, hébergement | 6570 Charges informatiques |
   | assurance (AXA, Mobilière, Zurich, Helvetia), taxes | 6300 Assurances-choses, droits, taxes |
   | électricité, SIG, Romande Énergie, eau | 6400 Énergie |
   | CFF/SBB, AG, essence, garage | 6200 Véhicules et transport |
   | Google Ads, annonce, publicité | 6600 Publicité |
   | salaires | 5000 Salaires |
   | AVS, caisse de compensation, LPP, LAA, Suva | 5700 Charges sociales |
   | AFC/ESTV TVA | 2200 TVA due |
   | frais de tenue de compte, intérêts débiteurs | 6900 Charges financières |
   | intérêts créanciers | 6950 Produits financiers |
   | paiement d'un client | 1100 Débiteurs (encaissement) |
   | administration fiscale, impôts directs | 8900 Impôts directs |
   En cas de doute : choisir le compte le plus probable **et** indiquer « oui » dans la colonne « Incertain » avec une courte justification.
5. **Créer l'Excel** avec `create_xlsx`, chemin par défaut `Resultats/Imputation_<periode>.xlsx` :
   - Feuille « Transactions » : Date | Banque | Libellé | Montant | Compte | Désignation | Incertain | Source. `totals: ["D"]`.
   - Feuille « Recapitulatif » : Compte | Désignation | Nombre | Total, avec formules `=SUMIF(Transactions!E:E,A2,Transactions!D:D)` et `=COUNTIF(Transactions!E:E,A2)`. Compte en nombre. `totals: ["D"]`.
   - Feuille « Controle » : par relevé Fichier | Solde initial | Somme des transactions | Solde final selon relevé | Écart (`=B2+C2-D2`).
6. **Contrôle** : solde initial + somme des transactions = solde final. Sinon relire et chercher les lignes manquantes ou en double. Signaler tout écart restant.
7. **Conclusion** : chemin du fichier, nombre de transactions, total par compte (bref), liste des imputations incertaines.

## Règles
- Toujours transmettre les montants en nombres (-2850.0), jamais en texte avec « CHF ».
- Ne rien inventer : montant manquant ou scan illisible → marquer « illisible ».
- TVA : si un justificatif indique la TVA (8,1 % normal, 2,6 % réduit, 3,8 % hébergement), la noter dans une colonne « TVA ».
