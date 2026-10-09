// Servizio e-mail (Fase 3 §5.7). Con SMTP_URL le e-mail partono davvero;
// senza, restano nella "posta di prova" consultabile dal sito in sviluppo.

import nodemailer from 'nodemailer'

const MASSIMO_POSTA_DI_PROVA = 50

export function creaPosta({ smtpUrl, mittente, sviluppo }) {
  const trasporto = smtpUrl ? nodemailer.createTransport(smtpUrl) : null
  const postaDiProva = []

  if (!trasporto && !sviluppo) {
    console.warn('Attenzione: SMTP_URL non impostato, le e-mail non verranno inviate')
  }

  return {
    async invia({ a, oggetto, testo }) {
      if (trasporto) {
        await trasporto.sendMail({ from: mittente, to: a, subject: oggetto, text: testo })
        return
      }
      postaDiProva.unshift({ a, oggetto, testo, inviata_il: new Date().toISOString() })
      postaDiProva.length = Math.min(postaDiProva.length, MASSIMO_POSTA_DI_PROVA)
    },

    /** Prova a inviare senza bloccare l'operazione principale se il servizio e-mail non risponde. */
    async inviaSenzaBloccare(messaggio) {
      try {
        await this.invia(messaggio)
      } catch (errore) {
        console.error(`E-mail a ${messaggio.a} non inviata:`, errore.message)
      }
    },

    postaDiProva: () => postaDiProva,
  }
}
