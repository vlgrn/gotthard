# Datenschutz / Protection des données (nDSG)

*Vorlage – kann von Treuhandbüros gegenüber ihren Klienten verwendet und angepasst werden. Keine Rechtsberatung.*

## Deutsch

**Welche Daten bleiben auf unserem Computer?** Alle Klientendateien, das Firmengedächtnis (`.gotthard/memory.md`), der Dokumentenindex (`.gotthard/index.db`) und alle Protokolle. Gotthard hat keinen eigenen Server und sendet keine Nutzungsdaten (keine Telemetrie).

**Was wird an den KI-Anbieter übermittelt?** Nur der Text unserer Anfragen sowie die Ausschnitte aus Dokumenten, die der Assistent zur Beantwortung liest, und das Firmengedächtnis. Standardanbieter ist Infomaniak Network SA mit Verarbeitung in Rechenzentren in der Schweiz (Genf). Alternativ kann ein Modell vollständig lokal betrieben werden (Ollama); dann verlässt keine Information den Computer.

**Wer hat Zugriff?** Nur Personen mit Zugriff auf unseren Computer bzw. den Arbeitsordner. Der API-Schlüssel ist im Schlüsselbund des Betriebssystems gespeichert.

**Kontrolle:** Der Assistent arbeitet ausschliesslich im gewählten Arbeitsordner, fragt vor dem Ausführen von Befehlen, vor Webzugriffen und vor dem Speichern von Notizen. Alle Freigaben und Dateiverschiebungen werden lokal protokolliert. Notizen zu einem Klienten können vollständig gelöscht werden («Klient vergessen»).

**Testbetrieb:** Der Anbieter «OpenCode Zen» verarbeitet Daten nicht in der Schweiz und darf nur mit fiktiven Testdaten verwendet werden.

## Français

**Quelles données restent sur notre ordinateur ?** Tous les fichiers clients, la mémoire de l'entreprise (`.gotthard/memory.md`), l'index des documents (`.gotthard/index.db`) et tous les journaux. Gotthard n'a pas de serveur propre et n'envoie aucune donnée d'utilisation (pas de télémétrie).

**Qu'est-ce qui est transmis au fournisseur d'IA ?** Uniquement le texte de nos demandes, les extraits de documents que l'assistant lit pour y répondre, et la mémoire de l'entreprise. Le fournisseur par défaut est Infomaniak Network SA, avec traitement dans des centres de données en Suisse (Genève). Un modèle peut aussi fonctionner entièrement en local (Ollama) ; aucune information ne quitte alors l'ordinateur.

**Qui y a accès ?** Uniquement les personnes ayant accès à notre ordinateur ou au dossier de travail. La clé API est conservée dans le trousseau du système d'exploitation.

**Contrôle :** l'assistant travaille exclusivement dans le dossier choisi et demande l'autorisation avant d'exécuter des commandes, d'accéder au web ou d'enregistrer des notes. Toutes les autorisations et tous les déplacements de fichiers sont journalisés localement. Les notes concernant un client peuvent être entièrement supprimées (« oublier ce client »).

**Phase de test :** le fournisseur « OpenCode Zen » ne traite pas les données en Suisse et ne doit être utilisé qu'avec des données fictives.
