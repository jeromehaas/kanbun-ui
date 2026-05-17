<script setup>

// IMPORTS
import './board-dropdown.scss'
import { ref, computed, nextTick } from 'vue'

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
})

// DEFINE EMITS
const emit = defineEmits(['update:modelValue'])

// SETUP STATE
const isOpen = ref(false)
const listStyle = ref({})

// COMPUTED: SELECTED BOARD
const selectedBoard = computed(() => props.boards.find((b) => b.id === props.modelValue) || null)

// DIRECTIVE: CLICK OUTSIDE
const vClickOutside = {

  // MOUNTED
  mounted: (el, binding) => {
    el._clickOutside = (e) => { if (!el.contains(e.target)) binding.value(e) }
    document.addEventListener('click', el._clickOutside, true)
  },

  // UNMOUNTED
  unmounted: (el) => {
    document.removeEventListener('click', el._clickOutside, true)
  },
}

// HANDLER: CLOSE
const close = () => {
  isOpen.value = false
}

// HANDLER: TOGGLE
const toggle = async () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    await nextTick()
    const trigger = document.querySelector('.board-dropdown__trigger')
    if (trigger) {
      const rect = trigger.getBoundingClientRect()
      listStyle.value = {
        position: 'fixed',
        top: `${rect.bottom + 6}px`,
        left: `${rect.left}px`,
        minWidth: `${Math.max(rect.width, 200)}px`,
        zIndex: 9999,
      }
    }
  }
}

// HANDLER: SELECT
const select = (id) => {

  // EMIT UPDATE
  emit('update:modelValue', id)

  // UPDATE STATE
  isOpen.value = false
}
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
