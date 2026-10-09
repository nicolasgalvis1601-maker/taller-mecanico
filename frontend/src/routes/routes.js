import { createRouter, createWebHashHistory } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'
import DashboardView from '../views/DashboardView.vue'
import ClientsView from '../views/ClientsView.vue'
import VehiclesView from '../views/VehiclesView.vue'
import VehicleHistoryView from '../views/VehicleHistoryView.vue'
import MechanicsView from '../views/MechanicsView.vue'
import ServicesView from '../views/ServicesView.vue'
import PartsView from '../views/PartsView.vue'
import OrdersView from '../views/OrdersView.vue'
import OrderDetailView from '../views/OrderDetailView.vue'
import NotFoundView from '../views/NotFoundView.vue'

const routes = [
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', redirect: '/inicio' },
      { path: 'inicio', name: 'dashboard', component: DashboardView, meta: { title: 'Inicio' } },
      { path: 'ordenes', name: 'orders', component: OrdersView, meta: { title: 'Órdenes de reparación' } },
      { path: 'ordenes/:id', name: 'order-detail', component: OrderDetailView, props: true, meta: { title: 'Detalle de orden' } },
      { path: 'clientes', name: 'clients', component: ClientsView, meta: { title: 'Clientes' } },
      { path: 'vehiculos', name: 'vehicles', component: VehiclesView, meta: { title: 'Vehículos' } },
      { path: 'vehiculos/:plate/historial', name: 'vehicle-history', component: VehicleHistoryView, props: true, meta: { title: 'Historial del vehículo' } },
      { path: 'mecanicos', name: 'mechanics', component: MechanicsView, meta: { title: 'Mecánicos' } },
      { path: 'servicios', name: 'services', component: ServicesView, meta: { title: 'Servicios' } },
      { path: 'repuestos', name: 'parts', component: PartsView, meta: { title: 'Repuestos' } },
      { path: ':pathMatch(.*)*', name: 'not-found', component: NotFoundView, meta: { title: 'Página no encontrada' } },
    ],
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// Título de la pestaña del navegador según la ruta
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Taller Mecánico Pro` : 'Taller Mecánico Pro'
})
