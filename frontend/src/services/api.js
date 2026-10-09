// src/services/api.js
// Instancia única de Axios para conectar el frontend con el backend (Express + MongoDB).
import axios from 'axios'
import { LoadingBar } from 'quasar'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ---------- Petición: barra de carga superior ----------
api.interceptors.request.use(
  (config) => {
    LoadingBar.start()
    return config
  },
  (error) => {
    LoadingBar.stop()
    return Promise.reject(error)
  }
)

// ---------- Respuesta: normaliza los errores del backend ----------
// El backend responde los errores como { error: 'mensaje', details?: [{ field, message }] }
api.interceptors.response.use(
  (response) => {
    LoadingBar.stop()
    return response
  },
  (error) => {
    LoadingBar.stop()

    let message
    if (error.response) {
      const data = error.response.data || {}
      message = data.error || data.message || `Error ${error.response.status}`
      if (Array.isArray(data.details) && data.details.length) {
        message += ': ' + data.details.map((d) => d.message).join(' · ')
      }
    } else if (error.code === 'ECONNABORTED') {
      message = 'El servidor tardó demasiado en responder'
    } else {
      message = `No se pudo conectar con el backend (${API_URL}). ¿Está encendido?`
    }

    error.userMessage = message
    return Promise.reject(error)
  }
)

/** Devuelve el mensaje legible de un error de Axios. */
export const getErrorMessage = (error) => error?.userMessage || error?.message || 'Ocurrió un error inesperado'

export default api
