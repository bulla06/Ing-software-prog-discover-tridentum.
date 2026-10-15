import { useRef } from 'react'

const SOGLIA = 72 // px verso il basso oltre cui il pannello si chiude

/**
 * Pannello dal basso che si chiude trascinandolo verso il basso (gesto tipico dei telefoni).
 * Lo spostamento si applica direttamente allo stile dell'elemento, senza stato React,
 * così il dito non fa ridisegnare la pagina a ogni movimento.
 * Il gesto è solo una scorciatoia: il pannello ha sempre anche il pulsante "Chiudi".
 */
export function useTrascinaPerChiudere(onChiudi) {
  const elemento = useRef(null)
  const inizio = useRef(null)

  const sposta = (dy) => {
    if (elemento.current) elemento.current.style.transform = dy > 0 ? `translateY(${dy}px)` : ''
  }

  const gestori = {
    onPointerDown(e) {
      // Solo tocco, e non quando si preme un pulsante o un link dentro il pannello
      if (e.pointerType !== 'touch' || e.target.closest('a, button')) return
      inizio.current = e.clientY
    },
    onPointerMove(e) {
      if (inizio.current == null) return
      sposta(e.clientY - inizio.current)
    },
    onPointerUp(e) {
      if (inizio.current == null) return
      const dy = e.clientY - inizio.current
      inizio.current = null
      if (dy > SOGLIA) onChiudi()
      else sposta(0)
    },
    onPointerCancel() {
      inizio.current = null
      sposta(0)
    },
  }

  return { ref: elemento, ...gestori }
}
