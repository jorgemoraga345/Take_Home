
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../constants'
import { IUserRole } from '../types'

export const generateToken = (id: string, role: IUserRole) => {
  return jwt.sign({ id, role }, JWT_SECRET, {
    expiresIn: '30d',
  })
}

export const verifyJwt = (token: string) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    return decoded as { id: string, role: IUserRole }
  } catch (error) {
    return null
  }
}

