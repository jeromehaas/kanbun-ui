<script setup>

// IMPORTS
import './task-modal.scss';
import { ref, reactive, onMounted } from 'vue';

// DEFINE PROPS
const props = defineProps({
  task: {
    type: Object,
    default: null,
  },
  mode: {
    type: String,
    default: 'edit',
  },
});

// DEFINE EMITS
const emit = defineEmits(['close', 'submit']);

// SETUP STATE
const titleRef = ref(null);
const form = reactive({
  title: props.task?.title || '',
  description: props.task?.description || '',
});

// LIFECYCLE
onMounted(() => {
  titleRef.value?.focus();
});

// HANDLER: HANDLE SUBMIT
const handleSubmit = () => {

  // STOP, IF NOT TITLE
  if (!form.title.trim()) return;

  // EMIT SUBMIT
  emit('submit', { title: form.title.trim(), description: form.description.trim() });
};

// HANDLER: HANDLE CLOSE
const handleClose = () => {

  // EMIT CLOSE
  emit('close');
};
</script>

<template>
  <Teleport to="body">
    <div class="task-modal" @click.self="handleClose">
      <div class="task-modal__dialog">
        <h3 class="task-modal__title">{{ mode === 'create' ? 'New Task' : 'Edit Task' }}</h3>
        <form class="task-modal__form" @submit.prevent="handleSubmit">
          <div class="task-modal__field">
            <label class="task-modal__label">Task Title</label>
            <input ref="titleRef" v-model="form.title"  class="task-modal__input" placeholder="Task title…" required />
          </div>
          <div class="task-modal__field">
            <label class="task-modal__label">Description</label>
            <textarea v-model="form.description" class="task-modal__input task-modal__input--textarea" placeholder="Description (optional)…" rows="4"></textarea>
          </div>
          <div class="task-modal__actions">
            <button type="button" class="task-modal__btn-cancel" @click="handleClose">Cancel</button>
            <button type="submit" class="task-modal__btn-save">
              {{ mode === 'create' ? 'Create Task' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
