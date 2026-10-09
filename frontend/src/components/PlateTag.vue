<script setup>
defineProps({ plate: { type: String, default: '' } })
</script>

<template>
  <span class="plate">{{ plate || '—' }}</span>
</template>
