// Informativa privacy (RNF-S04, GDPR artt. 12–14), in italiano e in inglese.
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
          'Le immagini della mappa arrivano da OpenStreetMap (tile.openstreetmap.org): come per ogni sito, il tuo browser comunica a quel servizio il proprio indirizzo IP.',
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
          'Map images come from OpenStreetMap (tile.openstreetmap.org): as with any website, your browser shares its IP address with that service.',
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
}
