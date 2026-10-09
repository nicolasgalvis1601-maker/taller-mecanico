import { Notify } from 'quasar'
import { getErrorMessage } from '../services/api.js'

export const notifySuccess = (message) =>
  Notify.create({ type: 'positive', message, icon: 'check_circle' })

export const notifyError = (error) =>
  Notify.create({ type: 'negative', message: typeof error === 'string' ? error : getErrorMessage(error), icon: 'error', timeout: 5000 })

export const notifyWarning = (message) =>
  Notify.create({ type: 'warning', message, icon: 'warning', textColor: 'dark' })
