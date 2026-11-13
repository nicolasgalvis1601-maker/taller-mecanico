<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: '' },
})
</script>

<template>
  <header class="page-header">
    <div class="page-header__main">
      <div v-if="icon" class="page-header__icon"><q-icon :name="icon" size="22px" /></div>
      <div class="page-header__text">
        <h1 class="page-header__title">{{ title }}</h1>
        <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
      </div>
    </div>
    <div class="page-header__actions"><slot name="actions" /></div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  margin-bottom: 20px;
}
.page-header__main {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.page-header__icon {
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: var(--q-primary);
  background: color-mix(in srgb, var(--q-primary) 10%, transparent);
}
.body--dark .page-header__icon {
  color: #8fb3e3;
  background: rgba(143, 179, 227, 0.12);
}
.page-header__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
}
.page-header__subtitle {
  margin: 2px 0 0;
  font-size: 0.875rem;
  color: var(--tm-text-muted);
}
.page-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
@media (max-width: 599px) {
  .page-header__title { font-size: 1.25rem; }
  .page-header__actions { width: 100%; }
  .page-header__actions > * { flex: 1 1 auto; }
}
</style>
