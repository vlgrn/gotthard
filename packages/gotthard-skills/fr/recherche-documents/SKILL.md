---
name: recherche-documents
description: Répondre à des questions sur des clients, des accords, des honoraires, des délais ou des travaux passés à partir des documents du dossier de travail, avec indication des sources. À utiliser pour « qu'avons-nous convenu avec … ? », « quel est le délai pour … ? », « trouve … ».
---

# Recherche dans les documents

## Déroulement
1. **Vérifier la mémoire de l'entreprise** (en bas du prompt système) : si une note répond déjà, s'en servir comme point de départ mais la confirmer si possible dans le document original.
2. **Chercher** avec `search_documents` – essayer plusieurs variantes :
   - nom du client + mots-clés (« Keller honoraires bouclement 2025 »),
   - synonymes et termes allemands si les documents sont en allemand (« Honorar », « Pauschale », « Offerte », « Akonto »),
   - peu de résultats : restreindre `folder` au dossier du client ou chercher le nom avec `grep`.
3. **Lire** en entier les 1 à 3 fichiers les plus pertinents avec `read_document` ou `read`.
4. **Répondre** :
   - D'abord la réponse directe en 1 à 3 phrases (montants CHF 1'234.50, dates 24.10.2026).
   - Puis les **sources** : `chemin/du/fichier` (page X) – courte citation dans la langue d'origine.
   - Signaler ouvertement les contradictions. Si rien n'est trouvé : le dire et indiquer où la recherche a porté.
5. **Mémoire** : si la réponse est un fait durable (p. ex. honoraires convenus) absent de la mémoire, proposer une note courte avec `remember` (avec la date de la source).
