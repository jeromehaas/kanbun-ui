<script setup>

// IMPORTS
import './search-modal.scss';
import { computed, nextTick, onMounted, ref, watch } from 'vue';

// DEFINE PROPS
const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  query: {
    type: String,
    default: '',
  },
  results: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
  hasSearched: {
    type: Boolean,
    default: false,
  },
});

// DEFINE EMITS
const emit = defineEmits(['close', 'update:query', 'select']);

// SETUP STATE
const searchInputRef = ref(null);
const hasQuery = computed(() => Boolean(props.query.trim()));
const showLoadingState = computed(() => props.loading && !props.results.length);
const showErrorState = computed(() => Boolean(props.error) && !props.results.length);
const showEmptyState = computed(() => hasQuery.value && props.hasSearched && !props.loading && !props.error && !props.results.length);
const showResults = computed(() => props.results.length > 0);

// FUNCTION: FOCUS SEARCH INPUT
const focusSearchInput = () => {
  nextTick(() => {
    searchInputRef.value?.focus();
  });
};

// HANDLER: CLOSE
const handleClose = () => {
  emit('close');
};

// HANDLER: UPDATE QUERY
const handleQueryInput = (event) => {
  emit('update:query', event.target.value);
};

// HANDLER: SELECT RESULT
const handleSelect = (result) => {
  emit('select', result);
};

// HANDLER: KEYDOWN
const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    handleClose();
  }
};

// WATCH: OPEN STATE
watch(() => props.open, (open) => {
  if (open) {
    focusSearchInput();
  }
});

// LIFECYCLE
onMounted(() => {
  if (props.open) {
    focusSearchInput();
  }
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="search-modal" @click.self="handleClose" @keydown="handleKeydown">
      <div class="search-modal__dialog" role="dialog" aria-modal="true" aria-label="Search cards">
        <div class="search-modal__header">
          <div>
            <h2 class="search-modal__title">Search Cards</h2>
            <p class="search-modal__subtitle">Search across every board, then jump straight to the matching card.</p>
          </div>
          <button type="button" class="search-modal__close" @click="handleClose">Esc</button>
        </div>
        <input ref="searchInputRef" :value="query" class="search-modal__input" placeholder="Search by card title, description, lane, or board…" @input="handleQueryInput" />
        <div v-if="hasQuery && loading && showResults" class="search-modal__status">Updating results…</div>
        <div v-else-if="error && showResults" class="search-modal__status search-modal__status--error">{{ error }}</div>
        <div class="search-modal__results">
          <div v-if="showLoadingState" class="search-modal__state">Searching…</div>
          <div v-else-if="showErrorState" class="search-modal__state search-modal__state--error">{{ error }}</div>
          <div v-else-if="showEmptyState" class="search-modal__state">No cards matched your search.</div>
          <div v-else-if="!hasQuery" class="search-modal__state">Press Shift twice to open this search, then start typing.</div>
          <template v-else>
            <button v-for="result in results" :key="result.task_id" type="button" class="search-modal__result" @click="handleSelect(result)">
              <div class="search-modal__result-top">
                <span class="search-modal__result-title">{{ result.title }}</span>
                <span class="search-modal__result-board">{{ result.board_name }}</span>
              </div>
              <p v-if="result.description" class="search-modal__result-description">{{ result.description }}</p>
              <div class="search-modal__result-meta">
                <span>{{ result.board_name }}</span>
                <span>{{ result.lane_name }}</span>
              </div>
            </button>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>
