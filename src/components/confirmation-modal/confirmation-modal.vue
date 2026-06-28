<script setup>

// IMPORTS
import './confirmation-modal.scss';
import { nextTick, onMounted, ref, watch } from 'vue';

// DEFINE PROPS
const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Confirm Action',
  },
  message: {
    type: String,
    default: '',
  },
  confirmLabel: {
    type: String,
    default: 'Confirm',
  },
  cancelLabel: {
    type: String,
    default: 'Cancel',
  },
});

// DEFINE EMITS
const emit = defineEmits(['close', 'confirm']);

// SETUP STATE
const cancelButtonRef = ref(null);

// FUNCTION: FOCUS CANCEL BUTTON
const focusCancelButton = () => {

  // WAIT FOR THE MODAL TO RENDER
  nextTick(() => {
    cancelButtonRef.value?.focus();
  });
};

// HANDLER: CLOSE
const handleClose = () => {

  // EMIT CLOSE
  emit('close');
};

// HANDLER: CONFIRM
const handleConfirm = () => {

  // EMIT CONFIRM
  emit('confirm');
};

// HANDLER: KEYDOWN
const handleKeydown = (event) => {

  // CLOSE ON ESCAPE
  if (event.key === 'Escape') {
    handleClose();
  }
};

// WATCH: OPEN STATE
watch(() => props.open, (open) => {
  if (open) {
    focusCancelButton();
  }
});

// LIFECYCLE
onMounted(() => {
  if (props.open) {
    focusCancelButton();
  }
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="confirmation-modal" @click.self="handleClose" @keydown="handleKeydown">
      <div class="confirmation-modal__dialog" role="dialog" aria-modal="true" :aria-label="title">
        <h2 class="confirmation-modal__title">{{ title }}</h2>
        <p class="confirmation-modal__message">{{ message }}</p>
        <div class="confirmation-modal__actions">
          <button ref="cancelButtonRef" type="button" class="confirmation-modal__btn-cancel" @click="handleClose">{{ cancelLabel }}</button>
          <button type="button" class="confirmation-modal__btn-confirm" @click="handleConfirm">{{ confirmLabel }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
