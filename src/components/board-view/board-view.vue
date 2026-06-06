<script setup>

// IMPORTS
import './board-view.scss'
import { ref, computed, nextTick } from 'vue'
import LaneColumn from '@/components/lane-column/lane-column.vue'
import TaskModal from '@/components/task-modal/task-modal.vue'
import { createLane, updateLane, deleteLane } from '@/api/lanes.js'
import { createTask, updateTask, deleteTask } from '@/api/tasks.js'

// DEFINE PROPS
const props = defineProps({
  board: {
    type: Object,
    required: true,
  },
})

// DEFINE EMITS
const emit = defineEmits(['refresh', 'delete'])

// COMPUTED: SORTED LANES
const sortedLanes = computed(() => {
  return [...(props.board.lanes || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
})

// SETUP STATE
const addingLane = ref(false)
const newLaneName = ref('')
const laneInputRef = ref(null)

// SETUP STATE — TASK MODAL
const taskModal = ref({ open: false, task: null, lane: null, mode: 'edit' })

// HANDLER: START ADD LANE
const startAddLane = async () => {

  // UPDATE LANE
  addingLane.value = true

  // WAIT ON NEXT TICK
  await nextTick()

  // SET FOCUS ON LANE
  laneInputRef.value?.focus()
}

// HANDLER: CANCEL LANE
const cancelLane = () => {

  // UPDATE LANE
  addingLane.value = false
  newLaneName.value = ''
}

// HANDLER: SUBMIT LANE
const submitLane = async () => {

  // GET NAME OF LANE
  const name = newLaneName.value.trim()

  // STOP IF NO NAME
  if (!name) {
    return
  }

  // TRY-CATCH BLOCK
  try {

    // CREATE LANE
    await createLane(props.board.id, name)

    // CANCEL LANE
    cancelLane()

    // EMIT REFRESH
    emit('refresh')

  // HANDLE ERRORS
  } catch (e) {

    // PRINT ERROR
    console.error('Failed to create lane', e)
  }
}

// HANDLER: HANDLE MOVE LANE
const handleMoveLane = async (lane, direction) => {

  // GET LANES
  const lanes = sortedLanes.value

  // GET IDS
  const idx = lanes.findIndex((l) => l.id === lane.id)
  const newIdx = idx + direction

  // STOP, IF ID IS NOT IN RANGE
  if (newIdx < 0 || newIdx >= lanes.length) {
    return
  }

  // GET NEW POSITION
  const newPos = lanes[newIdx].position

  // TRY-CATCH BLOCK
  try {

    // UPDATE LANE
    await updateLane(props.board.id, lane.id, { position: newPos })

    // EMIT REFRESH
    emit('refresh')

  // HANDLE ERRORS
  } catch (e) {

    // PRINT ERROR
    console.error('Failed to move lane', e)
  }
}

// HANDLER: HANDLE RENAME LANE
const handleRenameLane = async (lane, name) => {

  // TRY-CATCH BLOCK
  try {

    // UPDATE LANE
    await updateLane(props.board.id, lane.id, { name })

    // EMIT REFRESH
    emit('refresh');

  // HANDLE ERRORS
  } catch (e) {

    // PRINT ERROR
    console.error('Failed to rename lane', e)
  }
}

// HANDLER: HANDLE DELETE LANE
const handleDeleteLane = async (lane) => {

  // GET CONTIRMATION TO DELETE LANE
  if (!confirm(`Delete lane "${lane.name}"? All tasks will be lost.`)) return

  // TRY-CATCH BLOCK
  try {

    // DELETE LANE
    await deleteLane(props.board.id, lane.id)

    // EMIT REFRESH
    emit('refresh')

  // HANDLE ERRORS
  } catch (e) {

    // PRINT ERROR
    console.error('Failed to delete lane', e)
  }
}

// HANDLER: HANDLE OPEN ADD TASK
const handleOpenAddTask = (lane) => {

  // UPDATE TASK MODAL
  taskModal.value = { open: true, task: null, lane, mode: 'create' }
}

// HANDLER: HANDLE EDIT TASK
const handleEditTask = (task, lane) => {

  // STOP, IF NO TASK AVAILABLE
  if (!task) return

  // UPDATE TASK MODAL
  taskModal.value = { open: true, task, lane, mode: 'edit' }
}

// HANDLER: HANDLE TASK MODAL SUBMIT
const handleTaskModalSubmit = async (data) => {

  // GET TASK MODAL VALUES
  const { task, lane, mode } = taskModal.value

  // UPDATE TRASK MODAL
  taskModal.value.open = false

  // TRY-CATCH BLOCK
  try {

    // GET OR CREATE TASK
    if (mode === 'create') {
      await createTask(props.board.id, lane.id, data)
    } else if (task) {
      await updateTask(props.board.id, lane.id, task.id, data)
    }

    // EMIT REFRESH
    emit('refresh')

  // HANDLE ERRORS
  } catch (e) {

    // PRINT ERROR
    console.error('Failed to save task', e)
  }
}

// HANDLER: HANDLE DELETE TASK
const handleDeleteTask = async (task, lane) => {

  // GET CONFIRMATION TO DELETE TASK
  if (!confirm(`Delete task "${task.title}"?`)) return

  // TRY-CATCH BLOCK
  try {

    // DELETE TASK
    await deleteTask(props.board.id, lane.id, task.id)

    // EMIT REFRESH
    emit('refresh')

  // HANDLE ERRORS
  } catch (e) {

    // PRINT ERROR
    console.error('Failed to delete task', e)
  }
}

// FUNCTION: SYNC TASK METADATA IN LANE
const syncLaneTaskMetadata = (lane) => {

  // STOP, IF NO TASKS ARE AVAILABLE
  if (!lane?.tasks) {
    return;
  }

  // UPDATE TASK LANE IDS AND POSITIONS
  lane.tasks.forEach((laneTask, index) => {
    laneTask.lane_id = lane.id;
    laneTask.position = index;
  });
};

// FUNCTION: MOVE TASK LOCALLY
const moveTaskLocally = (task, fromLaneId, toLaneId, newIndex) => {

  // GET SOURCE AND TARGET LANES
  const sourceLane = props.board.lanes?.find((lane) => lane.id === fromLaneId);
  const targetLane = props.board.lanes?.find((lane) => lane.id === toLaneId);

  // STOP, IF LANES ARE NOT AVAILABLE
  if (!sourceLane || !targetLane) {
    return;
  }

  // ENSURE TASK ARRAYS EXIST
  sourceLane.tasks ||= [];
  targetLane.tasks ||= [];

  // HANDLE MOVE WITHIN THE SAME LANE
  if (fromLaneId === toLaneId) {
    const sourceIndex = sourceLane.tasks.findIndex((laneTask) => laneTask.id === task.id);

    if (sourceIndex === -1) {
      return;
    }

    const [movedTask] = sourceLane.tasks.splice(sourceIndex, 1);
    const boundedIndex = Math.max(0, Math.min(newIndex, sourceLane.tasks.length));

    sourceLane.tasks.splice(boundedIndex, 0, movedTask);
    syncLaneTaskMetadata(sourceLane);
    return;
  }

  // HANDLE MOVE ACROSS LANES
  const sourceIndex = sourceLane.tasks.findIndex((laneTask) => laneTask.id === task.id);
  const targetIndex = targetLane.tasks.findIndex((laneTask) => laneTask.id === task.id);
  const boundedIndex = Math.max(0, Math.min(newIndex, targetLane.tasks.length));
  const [movedTask] = sourceIndex === -1 ? [task] : sourceLane.tasks.splice(sourceIndex, 1);

  if (targetIndex !== -1) {
    targetLane.tasks.splice(targetIndex, 1);
  }

  targetLane.tasks.splice(boundedIndex, 0, movedTask);
  syncLaneTaskMetadata(sourceLane);
  syncLaneTaskMetadata(targetLane);
};

// HANDLER: HANDLE TASK DROPPED
const handleTaskDropped = async ({ task, fromLaneId, toLane, newIndex }) => {

  // GET LANE ID
  const originalLaneId = fromLaneId ?? task.lane_id ?? toLane.id;

  // STOP, IF NO LANE ID
  if (!originalLaneId) {
    return;
  }

  // UPDATE TASK ORDER LOCALLY
  moveTaskLocally(task, originalLaneId, toLane.id, newIndex);

  // TRY-CATCH BLOCK
  try {

    // UPDATE TASK
    if (originalLaneId === toLane.id) {
      await updateTask(props.board.id, toLane.id, task.id, { position: newIndex });
    } else {
      await updateTask(props.board.id, originalLaneId, task.id, {
        lane_id: toLane.id,
        position: newIndex,
      });
    }

    // EMIT REFRESH
    emit('refresh');

  // HANDLE ERRORS
  } catch (e) {

    // PRINT ERRORS
    console.error('Failed to move task', e)

    // EMIT REFRESH
    emit('refresh');
  }
}
</script>

<template>
  <div class="board-view">
    <div class="board-view__lanes">
      <lane-column v-for="(lane, idx) in sortedLanes"  :key="lane.id" :lane="lane" :board-id="board.id" :is-first="idx === 0" :is-last="idx === sortedLanes.length - 1"  @move="handleMoveLane" @delete="handleDeleteLane" @open-add-task="handleOpenAddTask"  @edit-task="handleEditTask"  @delete-task="handleDeleteTask" @rename-lane="handleRenameLane" @task-dropped="handleTaskDropped"/>
      <div class="board-view__add-lane">
        <template v-if="!addingLane">
          <button class="board-view__add-lane-btn" @click="startAddLane">+ Add Lane</button>
        </template>
        <div v-else class="board-view__add-lane-form">
          <input ref="laneInputRef" v-model="newLaneName" class="board-view__lane-input" placeholder="Lane name…" @keydown.esc="cancelLane" @keydown.enter="submitLane"/>
          <div class="board-view__form-actions">
            <button class="board-view__btn-ghost" @click="cancelLane">Cancel</button>
            <button class="board-view__btn-primary" @click="submitLane">Save</button>
          </div>
        </div>
      </div>
    </div>
    <task-modal v-if="taskModal.open" :task="taskModal.task" :mode="taskModal.mode" @close="taskModal.open = false" @submit="handleTaskModalSubmit"/>
  </div>
</template>
