<script setup>

// IMPORTS
import './task-card.scss';

// DEFINE PROPS
const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
  highlighted: {
    type: Boolean,
    default: false,
  },
});

// DEFINE EMITS
const emit = defineEmits(['edit', 'delete']);

// HANDLER: HANDLE CLICK
const handleClick = () => {

  // EMIT EDIT
  emit('edit', props.task);
};
</script>

<template>
  <div class="task-card" :class="{ 'task-card--highlighted': highlighted }" :data-task-id="task.id" @click="handleClick">
    <span class="task-card__badge">Task</span>
    <p class="task-card__title">{{ task.title }}</p>
    <template v-if="task.description">
      <p class="task-card__details-label">Details</p>
      <p class="task-card__description">{{ task.description }}</p>
    </template>
  </div>
</template>
