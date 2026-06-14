<script setup>

// IMPORTS
import './board-dropdown.scss';
import { ref, computed, nextTick } from 'vue';

// DEFINE PROPS
const props = defineProps({
  boards: {
    type: Array,
    default: () => [],
  },
  modelValue: {
    type: Number,
    default: null,
  },
});

// DEFINE EMITS
const emit = defineEmits(['update:modelValue']);

// SETUP STATE
const isOpen = ref(false);
const listStyle = ref({});

// COMPUTED: SELECTED BOARD
const selectedBoard = computed(() => props.boards.find((b) => b.id === props.modelValue) || null);

// DIRECTIVE: CLICK OUTSIDE
const vClickOutside = {

  // MOUNTED
  mounted: (el, binding) => {

    // APPEND  EVENT LISTENER
    el._clickOutside = (event) => {

      // CHECK FOR TARGET
      if (!el.contains(e.target)) {
        binding.value(event);
      }
    };

    // APPEND CLICK LISTENER
    document.addEventListener('click', el._clickOutside, true);
  },

  // UNMOUNTED
  unmounted: (el) => {

    // REMOVE CLICK LISTENER
    document.removeEventListener('click', el._clickOutside, true);
  },
};

// HANDLER: CLOSE
const close = () => {

  // UPDATE STATE
  isOpen.value = false;
};

// HANDLER: TOGGLE
const toggle = async () => {

  // UPDATE STATE
  isOpen.value = !isOpen.value;

  // IF DROPDOWN IS OPEN
  if (isOpen.value) {

    // TICK
    await nextTick();

    // GET TRIGGER ELEMENT
    const trigger = document.querySelector('.board-dropdown__trigger');

    // IF TRIGGER ELEMENT IS AVAILABLE
    if (trigger) {

      // GET RECT
      const rect = trigger.getBoundingClientRect();

      // APPEND STYLES
      listStyle.value = {
        position: 'fixed',
        top: `${rect.bottom + 6}px`,
        left: `${rect.left}px`,
        minWidth: `${Math.max(rect.width, 200)}px`,
        zIndex: 9999,
      };
    }
  }
};

// HANDLER: SELECT
const select = (id) => {

  // EMIT UPDATE
  emit('update:modelValue', id);

  // UPDATE STATE
  isOpen.value = false;
};
</script>

<template>
  <div class="board-dropdown" v-click-outside="close" :class="{ 'board-dropdown--open': isOpen }">
    <button class="board-dropdown__trigger" @click="toggle" :title="selectedBoard?.name || 'Select board'">
      <span class="board-dropdown__label">{{ selectedBoard?.name || 'Select a board' }}</span>
      <svg class="board-dropdown__chevron" :class="{ 'board-dropdown__chevron--rotated': isOpen }" width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 5L7 9L11 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <Teleport to="body">
      <div v-if="isOpen" class="board-dropdown__list" :style="listStyle">
        <div v-for="board in boards" :key="board.id"  class="board-dropdown__option" :class="{ 'board-dropdown__option--active': board.id === modelValue }" @click="select(board.id)">
          <span class="board-dropdown__option-name">{{ board.name }}</span>
          <svg v-if="board.id === modelValue" class="board-dropdown__check" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div v-if="!boards.length" class="board-dropdown__empty">No boards yet</div>
      </div>
    </Teleport>
  </div>
</template>
