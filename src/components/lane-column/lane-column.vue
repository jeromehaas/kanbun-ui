<script setup>

// IMPORTS
import './lane-column.scss';
import { ref, watch } from 'vue';
import draggable from 'vuedraggable';
import TaskCard from '@/components/task-card/task-card.vue';

// FUNCTION: SORT TASKS BY POSITION
const sortTasksByPosition = (tasks = []) => {

  // RETURN
  return [...tasks].sort((a, b) => {

    // GET DIFF POSITION
    const positionDiff = (a.position ?? 0) - (b.position ?? 0);

    // RETURN
    return positionDiff !== 0 ? positionDiff : (a.id ?? 0) - (b.id ?? 0);
  });
};

// DEFINE PROPS
const props = defineProps({
  lane: {
    type: Object,
    required: true,
  },
  boardId: {
    type: [Number, String],
    required: true,
  },
  isFirst: {
    type: Boolean,
    default: false,
  },
  isLast: {
    type: Boolean,
    default: false,
  },
  highlightedTaskId: {
    type: [Number, String],
    default: null,
  },
});

// DEFINE EMITS
const emit = defineEmits(['move', 'delete', 'editTask', 'deleteTask', 'addTask', 'taskDropped', 'renameLane', 'openAddTask']);

// DIRECTIVE: CLICK OUTSIDE
const vClickOutside = {

  // HOOK: MOUNTED
  mounted: (el, binding) => {

    // FUNCTION: CLICK OUTSIDE
    el._clickOutside = (event) => {

      // CHECK FOR TARAGET
      if (!el.contains(event.target)) {

        // RETURN
        return binding.value(event);
      }
    };

    // APPEND LISTENER
    document.addEventListener('click', el._clickOutside, true);
  },

  // HOOK: UNMOUNTED
  unmounted: (el) => {

    // REMOVE LISTENER FOR OUTSIDE CLICK
    document.removeEventListener('click', el._clickOutside, true);
  },
};

// SETUP STATE
const localTasks = ref(sortTasksByPosition(props.lane.tasks || []));
const laneMenuOpen = ref(false);
const editing = ref(false);
const editName = ref('');
const editRef = ref(null);

// WATCH: LANE TASKS
watch(() => props.lane.tasks, (newTasks) => {
  localTasks.value = sortTasksByPosition(newTasks || []);
}, { deep: true });

// HANDLER: HANDLE DELETE LANE
const handleDeleteLane = () => {

  // UPDATE LANE MENU
  laneMenuOpen.value = false;

  // EMIT DELETE
  emit('delete', props.lane);
};

// HANDLER: OPEN RENAME
const openRename = () => {

  // UPDATE LANE
  laneMenuOpen.value = false;
  editName.value = props.lane.name;
  editing.value = true;

  // REMOVE FOCUS
  setTimeout(() => {
    editRef.value?.focus();
  }, 0);
};

// HANDLER: SAVE EDIT
const saveEdit = () => {

  // GET NAME
  const name = editName.value.trim();

  // UPDATE VALUE
  editing.value = false;

  // EMIT RENAME
  if (name && name !== props.lane.name) {
    emit('renameLane', props.lane, name);
  }
};

// HANDLER: CANCEL EDIT
const cancelEdit = () => {

  // UPDATE STATE
  editing.value = false;
};

// HANDLER: ON DRAG CHANGE
const onDragChange = (event) => {

  // EMIT TASK DROPPED
  if (event.added) {
      emit('taskDropped', {
        task: event.added.element,
        fromLaneId: event.added.element.lane_id,
        toLane: props.lane,
        newIndex: event.added.newIndex,
      });
  } else if (event.moved) {
    emit('taskDropped', {
      task: event.moved.element,
      fromLaneId: props.lane.id,
      toLane: props.lane,
      newIndex: event.moved.newIndex,
    });
  }
};
</script>

<template>
  <div class="lane-column">
    <div class="lane-column__header">
      <div class="lane-column__header-top">
        <template v-if="!editing">
          <span class="lane-column__title">{{ lane.name }}</span>
        </template>
        <input v-else ref="editRef" v-model="editName" class="lane-column__edit-input"  @blur="saveEdit" @keydown.enter="saveEdit"  @keydown.esc="cancelEdit"/>
        <div class="lane-column__controls">
          <button v-if="!isFirst" class="lane-column__btn-icon" title="Move left" @click="$emit('move', lane, -1)">◀</button>
          <button v-if="!isLast" class="lane-column__btn-icon" title="Move right" @click="$emit('move', lane, 1)">▶</button>
          <div class="lane-column__menu-wrap">
            <button class="lane-column__btn-icon" @click="laneMenuOpen = !laneMenuOpen" title="Lane options">⋮</button>
            <div v-if="laneMenuOpen" class="lane-column__dropdown" v-click-outside="() => laneMenuOpen = false">
              <div class="lane-column__menu-item" @click="openRename">Rename Lane</div>
              <div class="lane-column__menu-item lane-column__menu-item--danger" @click="handleDeleteLane">Delete Lane</div>
            </div>
          </div>
        </div>
      </div>
      <div class="lane-column__subtitle">Total: {{ lane.tasks?.length || 0 }} task{{ (lane.tasks?.length || 0) !== 1 ? 's' : '' }}</div>
    </div>
    <draggable   :list="localTasks" group="tasks" item-key="id" class="lane-column__task-list" ghost-class="lane-column__task-ghost"  chosen-class="lane-column__task-chosen"  drag-class="lane-column__task-drag" :animation="180" @change="onDragChange">
      <template #item="{ element: task }">
        <task-card :task="task" :highlighted="task.id === highlightedTaskId" @edit="$emit('editTask', task, lane)" @delete="$emit('deleteTask', task, lane)"/>
      </template>
    </draggable>
    <div class="lane-column__footer">
      <button class="lane-column__add-task-btn" @click="$emit('openAddTask', lane)">+ Add Task</button>
    </div>
  </div>
</template>
