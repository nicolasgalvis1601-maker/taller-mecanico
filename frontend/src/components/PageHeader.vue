<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: '' },
})
</script>

<template>
  <div class="row items-center q-col-gutter-md q-mb-lg">
    <div class="col-12 col-sm row items-center no-wrap">
      <q-avatar v-if="icon" :icon="icon" color="primary" text-color="white" size="44px" class="q-mr-md" rounded />
      <div>
        <div class="text-h5 text-weight-bold">{{ title }}</div>
        <div v-if="subtitle" class="text-body2 text-grey-7">{{ subtitle }}</div>
      </div>
    </div>
    <div class="col-12 col-sm-auto row q-gutter-sm justify-end">
      <slot name="actions" />
    </div>
  </div>
</template>
