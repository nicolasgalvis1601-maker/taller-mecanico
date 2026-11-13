<script setup>
defineProps({
  editTooltip: { type: String, default: 'Editar' },
  deleteTooltip: { type: String, default: 'Eliminar' },
  showEdit: { type: Boolean, default: true },
  showDelete: { type: Boolean, default: true },
})
defineEmits(['edit', 'delete'])
</script>

<template>
  <!-- Acciones de fila: el slot por defecto permite anteponer acciones propias de cada vista -->
  <div class="row-actions">
    <slot />
    <q-btn v-if="showEdit" flat round dense color="secondary" icon="edit" @click="$emit('edit')">
      <q-tooltip>{{ editTooltip }}</q-tooltip>
    </q-btn>
    <q-btn v-if="showDelete" flat round dense color="negative" icon="delete" @click="$emit('delete')">
      <q-tooltip>{{ deleteTooltip }}</q-tooltip>
    </q-btn>
  </div>
</template>

<style scoped>
.row-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
