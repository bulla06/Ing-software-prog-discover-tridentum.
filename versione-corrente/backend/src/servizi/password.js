// Password salvate solo come hash bcrypt (RNF-S02).
import bcrypt from 'bcryptjs'

const COSTO = 12

export const hashPassword = (password) => bcrypt.hash(password, COSTO)
export const verificaPassword = (password, hash) => bcrypt.compare(password, hash)
