<script setup>

// IMPORTS
import './realtime-toast-message.scss';
import { computed } from 'vue';

// DEFINE PROPS
const props = defineProps({
  message: {
    type: String,
    required: true,
  },
  actor: {
    type: String,
    default: '',
  },
  entity: {
    type: String,
    default: '',
  },
});

// FUNCTION: ESCAPE REGEX INPUT
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// COMPUTED: HIGHLIGHTS
const highlights = computed(() => {

  // GET ALL ENTRIES
  const entries = [
    props.actor.trim() ? { text: props.actor.trim(), type: 'actor' } : null,
    props.entity.trim() ? { text: props.entity.trim(), type: 'entity' } : null,
  ].filter(Boolean);

  // RETURN
  return entries
    .filter((entry, index) => entries.findIndex((item) => item.text === entry.text) === index)
    .sort((left, right) => right.text.length - left.text.length);
});

// COMPUTED: MESSAGE SEGMENTS
const segments = computed(() => {

  // CHECK FOR PROPS MESSAGE
  if (!props.message) {
    return [];
  }

  // CHECK FOR HIGHTLIGHTS
  if (!highlights.value.length) {
    return [{ text: props.message, type: '' }];
  }

  // GET HIGHLIGHT TYPES AND PATTERN
  const highlightTypes = new Map(highlights.value.map((entry) => [entry.text, entry.type]));
  const pattern = new RegExp(`(${ highlights.value.map((entry) => escapeRegExp(entry.text)).join('|') })`, 'g');

  // RETURN
  return props.message
    .split(pattern)
    .filter(Boolean)
    .map((text) => ({ text, type: highlightTypes.get(text) || '' }));
});
</script>

<template>
  <span class="realtime-toast-message">
    <span
      v-for="(segment, index) in segments"
      :key="`${ index }-${ segment.text }`"
      :class="segment.type ? `realtime-toast-message__${ segment.type }` : ''"
    >{{ segment.text }}</span>
  </span>
</template>
