<script setup>

// IMPORTS
import './task-card.scss'

// DEFINE PROPS
const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
})

// DEFINE EMITS
const emit = defineEmits(['edit', 'delete'])

// HANDLER: HANDLE CLICK
const handleClick = () => {
  emit('edit', props.task)
}
</script>

<template>
  <div class="task-card" @click="handleClick">
    <span class="task-card__badge">Task</span>
    <p class="task-card__title">{{ task.title }}</p>
    <template v-if="task.description">
      <p class="task-card__details-label">Details</p>
      <p class="task-card__description">{{ task.description }}</p>
    </template>
  </div>
</template>
