import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api.js'

// Endpoints: /api/orders  (órdenes de reparación)
export const useOrderStore = defineStore(
  'orders',
  () => {
    const orders = ref([])
    const activeOrders = ref([])
    const currentOrder = ref(null)
    const statusFilter = ref(null) // filtro elegido en la tabla (se recuerda al recargar)
    const loading = ref(false)

    const activeCount = computed(() => activeOrders.value.length)

    async function fetchOrders(status = statusFilter.value) {
      loading.value = true
      try {
        const params = status ? { status } : {}
        const { data } = await api.get('/orders', { params })
        orders.value = data
        return data
      } finally {
        loading.value = false
      }
    }

    async function fetchActiveOrders() {
      const { data } = await api.get('/orders/active')
      activeOrders.value = data
      return data
    }

    async function fetchOrder(id) {
      const { data } = await api.get(`/orders/${id}`)
      currentOrder.value = data
      return data
    }

    // Body: { vehicle | plate, mechanic, problem, diagnosis?, notes?, services?: [{service, quantity}], parts?: [{part, quantity}] }
    async function createOrder(payload) {
      const { data } = await api.post('/orders', payload)
      await fetchOrders()
      return data
    }

    // Edita problem, diagnosis, notes o mechanic
    async function updateOrder(id, payload) {
      const { data } = await api.patch(`/orders/${id}`, payload)
      currentOrder.value = data
      return data
    }

    async function changeStatus(id, status, extra = {}) {
      const { data } = await api.patch(`/orders/${id}/status`, { status, ...extra })
      currentOrder.value = data
      return data
    }

    async function addItems(id, { services = [], parts = [] }) {
      const { data } = await api.post(`/orders/${id}/items`, { services, parts })
      currentOrder.value = data
      return data
    }

    // type: 'services' | 'parts'
    async function removeItem(id, type, itemId) {
      const { data } = await api.delete(`/orders/${id}/items/${type}/${itemId}`)
      currentOrder.value = data
      return data
    }

    return {
      orders, activeOrders, currentOrder, statusFilter, loading, activeCount,
      fetchOrders, fetchActiveOrders, fetchOrder, createOrder, updateOrder, changeStatus, addItems, removeItem,
    }
  },
  { persist: { pick: ['orders', 'activeOrders', 'statusFilter'] } }
)
