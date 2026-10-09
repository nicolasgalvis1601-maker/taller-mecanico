const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const dateTime = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
const date = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })

export const formatMoney = (value) => currency.format(Number(value) || 0)
export const formatDateTime = (value) => (value ? dateTime.format(new Date(value)) : '—')
export const formatDate = (value) => (value ? date.format(new Date(value)) : '—')
export const shortId = (id) => (id ? `#${String(id).slice(-6).toUpperCase()}` : '')
