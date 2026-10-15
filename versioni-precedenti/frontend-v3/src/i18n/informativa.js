// Informativa privacy (RNF-S04, GDPR artt. 12–14), in italiano, inglese e tedesco.
// I tempi di conservazione e l'indirizzo di contatto arrivano dal server (GET /api/informazioni),
// così l'informativa dice sempre quello che il server fa davvero.
// Segnaposti: {contatto} {account} {contenuti} {sessione}

export const AGGIORNATA = '2026-10-10'

export default {
  it: {
    titolo: 'Informativa privacy',
    aggiornata: 'Aggiornata al 10 ottobre 2026',
    intro:
      'Questa pagina spiega quali dati personali raccoglie Discover Tridentum, perché, per quanto tempo e come puoi controllarli. Per esplorare mappa, schede, itinerari e gioco non serve un account e non raccogliamo dati che ti identificano.',
    sezioni: [
      {
        titolo: 'Chi tratta i dati',
        testi: [
          'Discover Tridentum è un progetto del corso di Ingegneria del Software dell’Università di Trento (anno accademico 2026-2027), realizzato da Manuel Bulla, Marco Buffa e Pietro Crea, titolari del trattamento.',
          'Per qualsiasi richiesta sui tuoi dati scrivi a {contatto}.',
        ],
      },
      {
        titolo: 'Quali dati, perché e su quale base',
        elenco: [
          '**Account**: nome visualizzato, e-mail, password (salvata solo in forma cifrata, non leggibile da nessuno) e data in cui hai accettato questa informativa. Servono a gestire il tuo account e a mandarti le e-mail di servizio: conferma dell’indirizzo, password dimenticata, esito della moderazione. Base giuridica: il servizio che ci chiedi registrandoti (art. 6.1.b GDPR).',
          '**Ricordi che condividi**: testo, anno, licenza scelta e foto. Prima dell’invio la foto viene ridotta e privata dei dati nascosti (EXIF), compresa la posizione GPS. Dopo il controllo di un moderatore il ricordo viene pubblicato nella scheda del luogo con il tuo nome visualizzato. Se acconsenti a usare la foto nel gioco puoi indicare anche il punto in cui l’hai scattata: serve solo al gioco. Base giuridica: il tuo consenso (art. 6.1.a), che puoi revocare eliminando il contributo con l’account.',
          '**Luoghi salvati e punteggi di “Dov’era?”**: legati al tuo account; nella classifica compare il tuo nome visualizzato. Base giuridica: il servizio che ci chiedi (art. 6.1.b).',
          '**Posizione**: la usa il tuo browser per mostrarti le distanze e cosa hai vicino, e solo se gliela concedi. Non arriva al nostro server, tranne quando crei un itinerario su misura: in quel caso serve a calcolare il percorso e non viene salvata.',
          '**Dati tecnici**: per proteggere il sito dagli abusi il server tiene in memoria l’indirizzo IP di chi fa molte richieste, al massimo per un giorno, senza salvarlo. Il registro delle richieste non contiene indirizzi IP. Base giuridica: il legittimo interesse alla sicurezza del servizio (art. 6.1.f).',
        ],
      },
      {
        titolo: 'Per quanto tempo',
        elenco: [
          'L’account e i dati collegati restano finché non lo elimini. Se non confermi l’e-mail, l’account viene cancellato dopo {account} giorni.',
          'I ricordi pubblicati restano finché non elimini l’account; in quel momento scegli se cancellarli o lasciarli in forma anonima. I ricordi non ancora pubblicati si cancellano sempre.',
          'I ricordi rifiutati o rimossi dopo una segnalazione vengono cancellati, con le foto, {contenuti} giorni dopo la decisione.',
          'La sessione dura al massimo {sessione} giorni dall’ultimo utilizzo; quando esci viene chiusa subito.',
        ],
      },
      {
        titolo: 'Chi riceve i dati',
        elenco: [
          'Non vendiamo né cediamo i tuoi dati. Sono conservati sul server che ospita il sito; le e-mail partono dal servizio di posta configurato per il sito.',
          'Le immagini della mappa arrivano da MapTiler (api.maptiler.com), basate sui dati di OpenStreetMap; la vista satellitare, solo se la attivi, da Esri (server.arcgisonline.com). Come per ogni sito, il tuo browser comunica a questi servizi il proprio indirizzo IP.',
          '“Come arrivare” apre Google Maps, e solo quando lo tocchi.',
        ],
      },
      {
        titolo: 'Cookie e memoria del browser',
        elenco: [
          'Usiamo un solo cookie, “tridentum_rinnovo”, e solo dopo che hai effettuato l’accesso: è un cookie tecnico che mantiene aperta la sessione per {sessione} giorni e si cancella quando esci. Non usiamo cookie di profilazione né di terze parti.',
          'Nella memoria del tuo browser salviamo la lingua scelta, se hai già visto la schermata di benvenuto, il record di “Dov’era?” e la partita in corso. Restano solo sul tuo dispositivo e puoi cancellarli dalle impostazioni del browser.',
        ],
      },
      {
        titolo: 'I tuoi diritti',
        elenco: [
          '**Accesso e portabilità**: dal Profilo, “Scarica i miei dati” ti dà tutti i tuoi dati in un file JSON.',
          '**Rettifica**: dal Profilo puoi cambiare il nome visualizzato; per l’e-mail scrivici.',
          '**Cancellazione**: dal Profilo, “Elimina il mio account” cancella subito l’account e i dati personali.',
          '**Revoca del consenso, limitazione e opposizione**: scrivici all’indirizzo indicato sopra; rispondiamo entro 30 giorni.',
          '**Reclamo**: puoi rivolgerti al Garante per la protezione dei dati personali (garanteprivacy.it).',
        ],
      },
      {
        titolo: 'Età minima e sicurezza',
        testi: [
          'Per registrarti devi avere almeno 14 anni.',
          'Il sito usa connessioni cifrate (HTTPS). Le foto in attesa di moderazione sono visibili solo a te e ai moderatori; le funzioni di moderazione e amministrazione sono riservate a chi ha quel ruolo.',
        ],
      },
    ],
    contattoMancante: 'l’indirizzo indicato da chi gestisce il sito',
  },

  en: {
    titolo: 'Privacy notice',
    aggiornata: 'Last updated 10 October 2026',
    intro:
      'This page explains what personal data Discover Tridentum collects, why, for how long and how you can control it. You don’t need an account to explore the map, places, walks and game, and we don’t collect data that identifies you.',
    sezioni: [
      {
        titolo: 'Who processes the data',
        testi: [
          'Discover Tridentum is a project of the Software Engineering course at the University of Trento (academic year 2026-2027), made by Manuel Bulla, Marco Buffa and Pietro Crea, who are the data controllers.',
          'For any request about your data, write to {contatto}.',
        ],
      },
      {
        titolo: 'What data, why and on what legal basis',
        elenco: [
          '**Account**: display name, e-mail, password (stored only in encrypted form, unreadable by anyone) and the date you accepted this notice. We use them to manage your account and send you service e-mails: address confirmation, forgotten password, moderation outcome. Legal basis: the service you request by signing up (Art. 6(1)(b) GDPR).',
          '**Memories you share**: text, year, chosen licence and photo. Before upload the photo is resized and stripped of hidden data (EXIF), including GPS location. After a moderator’s review the memory is published on the place’s page with your display name. If you allow the photo to be used in the game, you can also mark where you took it: it is only used for the game. Legal basis: your consent (Art. 6(1)(a)), which you can withdraw by deleting the contribution with your account.',
          '**Saved places and “Where was it?” scores**: linked to your account; the leaderboard shows your display name. Legal basis: the service you request (Art. 6(1)(b)).',
          '**Location**: your browser uses it to show distances and what is near you, and only if you allow it. It does not reach our server, except when you create a custom walk: then it is used to plan the route and is not stored.',
          '**Technical data**: to protect the site from abuse, the server keeps in memory the IP address of anyone making many requests, for one day at most, without storing it. The request log contains no IP addresses. Legal basis: legitimate interest in the security of the service (Art. 6(1)(f)).',
        ],
      },
      {
        titolo: 'How long we keep it',
        elenco: [
          'Your account and linked data stay until you delete the account. If you never confirm your e-mail, the account is deleted after {account} days.',
          'Published memories stay until you delete your account; at that point you choose whether to delete them or keep them anonymous. Memories not yet published are always deleted.',
          'Memories that were rejected, or removed after a report, are deleted with their photos {contenuti} days after the decision.',
          'A session lasts at most {sessione} days from its last use; when you log out it is closed immediately.',
        ],
      },
      {
        titolo: 'Who receives the data',
        elenco: [
          'We do not sell or share your data. It is stored on the server hosting the site; e-mails are sent through the mail service configured for the site.',
          'Map images come from MapTiler (api.maptiler.com), based on OpenStreetMap data; the satellite view, only if you turn it on, comes from Esri (server.arcgisonline.com). As with any website, your browser shares its IP address with these services.',
          '“Directions” opens Google Maps, and only when you tap it.',
        ],
      },
      {
        titolo: 'Cookies and browser storage',
        elenco: [
          'We use a single cookie, “tridentum_rinnovo”, and only after you log in: it is a technical cookie that keeps your session open for {sessione} days and is deleted when you log out. We use no profiling or third-party cookies.',
          'In your browser’s storage we save your chosen language, whether you have seen the welcome screen, your “Where was it?” record and the game in progress. They stay on your device and you can clear them in your browser settings.',
        ],
      },
      {
        titolo: 'Your rights',
        elenco: [
          '**Access and portability**: in your Profile, “Download my data” gives you all your data in a JSON file.',
          '**Rectification**: you can change your display name in your Profile; for your e-mail, write to us.',
          '**Erasure**: in your Profile, “Delete my account” immediately deletes your account and personal data.',
          '**Withdrawing consent, restriction and objection**: write to the address above; we reply within 30 days.',
          '**Complaints**: you can contact the Italian Data Protection Authority (garanteprivacy.it).',
        ],
      },
      {
        titolo: 'Minimum age and security',
        testi: [
          'You must be at least 14 to sign up.',
          'The site uses encrypted connections (HTTPS). Photos awaiting moderation are visible only to you and the moderators; moderation and administration features are restricted to users with those roles.',
        ],
      },
    ],
    contattoMancante: 'the address given by whoever runs the site',
  },

  de: {
    titolo: 'Datenschutzerklärung',
    aggiornata: 'Zuletzt aktualisiert am 10. Oktober 2026',
    intro:
      'Diese Seite erklärt, welche personenbezogenen Daten Discover Tridentum erhebt, warum, wie lange und wie du sie kontrollieren kannst. Zum Entdecken von Karte, Orten, Routen und Spiel brauchst du kein Konto, und wir erheben keine Daten, die dich identifizieren.',
    sezioni: [
      {
        titolo: 'Wer die Daten verarbeitet',
        testi: [
          'Discover Tridentum ist ein Projekt des Kurses Software Engineering an der Universität Trient (Studienjahr 2026-2027), umgesetzt von Manuel Bulla, Marco Buffa und Pietro Crea, die die Verantwortlichen für die Datenverarbeitung sind.',
          'Für jede Anfrage zu deinen Daten schreibe an {contatto}.',
        ],
      },
      {
        titolo: 'Welche Daten, warum und auf welcher Rechtsgrundlage',
        elenco: [
          '**Konto**: Anzeigename, E-Mail, Passwort (nur verschlüsselt gespeichert, für niemanden lesbar) und das Datum, an dem du diese Erklärung akzeptiert hast. Sie dienen dazu, dein Konto zu verwalten und dir Service-E-Mails zu schicken: Bestätigung der Adresse, vergessenes Passwort, Ergebnis der Moderation. Rechtsgrundlage: der Dienst, den du mit der Registrierung anforderst (Art. 6 Abs. 1 Buchst. b DSGVO).',
          '**Erinnerungen, die du teilst**: Text, Jahr, gewählte Lizenz und Foto. Vor dem Senden wird das Foto verkleinert und von versteckten Daten (EXIF) befreit, auch vom GPS-Standort. Nach der Prüfung durch einen Moderator wird die Erinnerung mit deinem Anzeigenamen im Steckbrief des Ortes veröffentlicht. Wenn du der Verwendung des Fotos im Spiel zustimmst, kannst du auch den Punkt angeben, an dem du es aufgenommen hast: Er dient nur dem Spiel. Rechtsgrundlage: deine Einwilligung (Art. 6 Abs. 1 Buchst. a), die du widerrufen kannst, indem du den Beitrag mit dem Konto löschst.',
          '**Gemerkte Orte und Punktestände von „Wo war das?“**: mit deinem Konto verknüpft; in der Rangliste erscheint dein Anzeigename. Rechtsgrundlage: der Dienst, den du anforderst (Art. 6 Abs. 1 Buchst. b).',
          '**Standort**: Dein Browser nutzt ihn, um dir Entfernungen und das zu zeigen, was in deiner Nähe ist, und nur, wenn du ihn freigibst. Er gelangt nicht zu unserem Server, außer wenn du eine Route nach Maß erstellst: Dann dient er der Berechnung der Strecke und wird nicht gespeichert.',
          '**Technische Daten**: Um die Website vor Missbrauch zu schützen, hält der Server die IP-Adresse von Personen, die viele Anfragen stellen, höchstens einen Tag lang im Speicher, ohne sie zu speichern. Das Anfrageprotokoll enthält keine IP-Adressen. Rechtsgrundlage: das berechtigte Interesse an der Sicherheit des Dienstes (Art. 6 Abs. 1 Buchst. f).',
        ],
      },
      {
        titolo: 'Wie lange',
        elenco: [
          'Das Konto und die verknüpften Daten bleiben bestehen, bis du das Konto löschst. Wenn du die E-Mail nicht bestätigst, wird das Konto nach {account} Tagen gelöscht.',
          'Veröffentlichte Erinnerungen bleiben bestehen, bis du das Konto löschst; dann entscheidest du, ob sie gelöscht oder anonym belassen werden. Noch nicht veröffentlichte Erinnerungen werden immer gelöscht.',
          'Abgelehnte oder nach einer Meldung entfernte Erinnerungen werden {contenuti} Tage nach der Entscheidung samt Fotos gelöscht.',
          'Eine Sitzung dauert höchstens {sessione} Tage ab der letzten Nutzung; wenn du dich abmeldest, wird sie sofort beendet.',
        ],
      },
      {
        titolo: 'Wer die Daten erhält',
        elenco: [
          'Wir verkaufen oder übermitteln deine Daten nicht. Sie werden auf dem Server gespeichert, der die Website hostet; E-Mails werden über den für die Website eingerichteten Maildienst versendet.',
          'Die Kartenbilder stammen von MapTiler (api.maptiler.com) auf Basis von OpenStreetMap-Daten; die Satellitenansicht, nur wenn du sie einschaltest, von Esri (server.arcgisonline.com). Wie bei jeder Website teilt dein Browser diesen Diensten seine IP-Adresse mit.',
          '„Anreise“ öffnet Google Maps, und zwar nur, wenn du es antippst.',
        ],
      },
      {
        titolo: 'Cookies und Speicher des Browsers',
        elenco: [
          'Wir verwenden nur ein einziges Cookie, „tridentum_rinnovo“, und nur nachdem du dich angemeldet hast: Es ist ein technisches Cookie, das deine Sitzung {sessione} Tage lang offen hält und beim Abmelden gelöscht wird. Wir verwenden keine Profiling-Cookies und keine Cookies von Dritten.',
          'Im Speicher deines Browsers sichern wir die gewählte Sprache, ob du den Willkommensbildschirm schon gesehen hast, deinen Rekord bei „Wo war das?“ und das laufende Spiel. Sie bleiben nur auf deinem Gerät, und du kannst sie in den Einstellungen des Browsers löschen.',
        ],
      },
      {
        titolo: 'Deine Rechte',
        elenco: [
          '**Auskunft und Übertragbarkeit**: Im Profil gibt dir „Meine Daten herunterladen“ alle deine Daten in einer JSON-Datei.',
          '**Berichtigung**: Im Profil kannst du den Anzeigenamen ändern; für die E-Mail-Adresse schreibe uns.',
          '**Löschung**: Im Profil löscht „Mein Konto löschen“ sofort das Konto und die personenbezogenen Daten.',
          '**Widerruf der Einwilligung, Einschränkung und Widerspruch**: Schreibe an die oben genannte Adresse; wir antworten innerhalb von 30 Tagen.',
          '**Beschwerde**: Du kannst dich an die italienische Datenschutzbehörde wenden (garanteprivacy.it).',
        ],
      },
      {
        titolo: 'Mindestalter und Sicherheit',
        testi: [
          'Für die Registrierung musst du mindestens 14 Jahre alt sein.',
          'Die Website verwendet verschlüsselte Verbindungen (HTTPS). Fotos, die auf die Moderation warten, sind nur für dich und die Moderatoren sichtbar; die Funktionen zur Moderation und Verwaltung sind denjenigen vorbehalten, die diese Rolle haben.',
        ],
      },
    ],
    contattoMancante: 'die Adresse, die von den Betreibern der Website angegeben wird',
  },
}
