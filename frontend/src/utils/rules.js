// Reglas de validación para los q-input (coinciden con las validaciones del backend)
export const required = (v) => (v !== null && v !== undefined && String(v).trim() !== '') || 'Campo obligatorio'
export const minLength = (n) => (v) => !v || String(v).trim().length >= n || `Mínimo ${n} caracteres`
export const phone = (v) => !v || /^[0-9+()\-\s]{7,20}$/.test(v) || 'Teléfono no válido (7 a 20 dígitos)'
export const email = (v) => !v || /^\S+@\S+\.\S+$/.test(v) || 'Correo no válido'
export const nonNegative = (v) => v === '' || v === null || Number(v) >= 0 || 'No puede ser negativo'
export const integer = (v) => v === '' || v === null || Number.isInteger(Number(v)) || 'Debe ser un número entero'
export const year = (v) => {
  const n = Number(v)
  return (Number.isInteger(n) && n >= 1900 && n <= new Date().getFullYear() + 1) || `Año entre 1900 y ${new Date().getFullYear() + 1}`
}
