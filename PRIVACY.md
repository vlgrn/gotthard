# Datenschutz / Protection des données (nDSG)

*Vorlage für Arztpraxen, Kliniken und Spitäler – anpassbar, keine Rechtsberatung. Gesundheitsdaten sind besonders schützenswerte Personendaten (nDSG) und unterstehen dem Berufsgeheimnis (Art. 321 StGB).*

## Deutsch

**Welche Daten bleiben auf unserem Computer?** Alle Patientendokumente, das Praxisgedächtnis (`.gotthard/memory.md`), der Dokumentenindex (`.gotthard/index.db`) und alle Protokolle. Gotthard hat keinen eigenen Server und sendet keine Nutzungsdaten (keine Telemetrie).

**Was wird an den KI-Anbieter übermittelt?** Nur der Text unserer Anfragen sowie die Ausschnitte aus Dokumenten, die der Assistent zur Bearbeitung liest. Standardanbieter ist Infomaniak Network SA mit Verarbeitung in Rechenzentren in der Schweiz (Genf). Alternativ kann ein Modell vollständig lokal betrieben werden (Ollama); dann verlässt keine Information den Computer. Mit dem Anbieter ist ein Auftragsverarbeitungsvertrag abzuschliessen.

**Wer hat Zugriff?** Nur Personen mit Zugriff auf unseren Computer bzw. den Arbeitsordner. Der API-Schlüssel ist im Schlüsselbund des Betriebssystems gespeichert.

**Kontrolle:** Der Assistent arbeitet ausschliesslich im gewählten Arbeitsordner und fragt, bevor er Befehle ausführt, Webseiten abruft oder sich etwas merkt. Im Praxisgedächtnis werden keine Gesundheitsdaten gespeichert. Alle Freigaben und Dateiverschiebungen werden lokal protokolliert. Der Assistent stellt keine Diagnosen; Berichte und Briefe sind Entwürfe zur ärztlichen Prüfung.

**Testbetrieb:** Der Anbieter «OpenCode Zen» verarbeitet Daten nicht in der Schweiz und darf nur mit fiktiven Testdaten verwendet werden.

## Français

**Quelles données restent sur notre ordinateur ?** Tous les documents des patient·e·s, la mémoire du cabinet (`.gotthard/memory.md`), l'index des documents (`.gotthard/index.db`) et tous les journaux. Gotthard n'a pas de serveur propre et n'envoie aucune donnée d'utilisation (pas de télémétrie).

**Qu'est-ce qui est transmis au fournisseur d'IA ?** Uniquement le texte de nos demandes et les extraits de documents que l'assistant lit pour les traiter. Le fournisseur par défaut est Infomaniak Network SA, avec traitement dans des centres de données en Suisse (Genève). Un modèle peut aussi fonctionner entièrement en local (Ollama) ; aucune information ne quitte alors l'ordinateur. Un contrat de sous-traitance doit être conclu avec le fournisseur.

**Qui y a accès ?** Uniquement les personnes ayant accès à notre ordinateur ou au dossier de travail. La clé API est conservée dans le trousseau du système d'exploitation.

**Contrôle :** l'assistant travaille exclusivement dans le dossier choisi et demande l'autorisation avant d'exécuter des commandes, d'accéder au web ou de mémoriser quelque chose. Aucune donnée de santé n'est enregistrée dans la mémoire du cabinet. Toutes les autorisations et tous les déplacements de fichiers sont journalisés localement. L'assistant ne pose pas de diagnostic ; les rapports et lettres sont des projets à valider par le médecin.

**Phase de test :** le fournisseur « OpenCode Zen » ne traite pas les données en Suisse et ne doit être utilisé qu'avec des données fictives.
