<script setup>

// IMPORTS
import './board-view.scss';
import { ref, computed, nextTick } from 'vue';
import LaneColumn from '@/components/lane-column/lane-column.vue';
import ConfirmationModal from '@/components/confirmation-modal/confirmation-modal.vue';
import TaskModal from '@/components/task-modal/task-modal.vue';
import { createLane, updateLane, deleteLane } from '@/api/lanes.js';
import { createTask, updateTask, deleteTask } from '@/api/tasks.js';

// DEFINE PROPS
const props = defineProps({
  board: {
    type: Object,
    required: true,
  },
  highlightedTaskId: {
    type: [Number, String],
    default: null,
  },
});

// DEFINE EMITS
const emit = defineEmits(['refresh', 'delete']);

// DEFINE CHART PALETTE
const laneChartPalette = ['#2E1B75', '#4B32B0', '#6B5CE7', '#8A7BF0', '#AA9AF6', '#CAC1FB', '#E9E3FE'];

// COMPUTED: SORTED LANES
const sortedLanes = computed(() => {

  // RETURN
  return [...(props.board.lanes || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
});

// COMPUTED: LANE METRICS
const laneMetrics = computed(() => {

  // GET MAX TASK COUNT
  const maxTaskCount = Math.max(...sortedLanes.value.map((lane) => lane.tasks?.length || 0), 0);

  // RETURN
  return sortedLanes.value.map((lane, index) => {
    const taskCount = lane.tasks?.length || 0;
    const percentage = maxTaskCount ? Math.max((taskCount / maxTaskCount) * 100, taskCount ? 12 : 0) : 0;

    return {
      id: lane.id,
      name: lane.name,
      taskCount,
      percentage,
      color: laneChartPalette[index % laneChartPalette.length],
    };
  });
});

// COMPUTED: TOTAL TASKS
const totalTasks = computed(() => {

  // RETURN
  return laneMetrics.value.reduce((sum, lane) => sum + lane.taskCount, 0);
});

// COMPUTED: LANE SHARE SEGMENTS
const laneShareSegments = computed(() => {

  // RETURN
  return laneMetrics.value.map((lane) => ({
    ...lane,
    share: totalTasks.value ? (lane.taskCount / totalTasks.value) * 100 : 0,
  }));
});

// COMPUTED: DOUGHNUT STYLE
const laneShareDoughnutStyle = computed(() => {

  // FILTER NON-EMPTY LANES
  const segments = laneShareSegments.value.filter((lane) => lane.taskCount > 0);

  // RETURN EMPTY STATE RING
  if (!segments.length) {
    return {
      background: 'conic-gradient(var(--bg-column) 0 100%)',
    };
  }

  // BUILD CONIC GRADIENT STOPS
  let offset = 0;
  const gradientStops = segments.map((lane) => {
    const start = offset;
    offset += lane.share;
    return `${ lane.color } ${ start }% ${ offset }%`;
  }).join(', ');

  // RETURN
  return {
    background: `conic-gradient(${ gradientStops })`,
  };
});

// SETUP STATE
const addingLane = ref(false);
const newLaneName = ref('');
const laneInputRef = ref(null);
const confirmationModal = ref({
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Delete',
  action: null,
});

// SETUP STATE — TASK MODAL
const taskModal = ref({ open: false, task: null, lane: null, mode: 'edit' });

// HANDLER: CLOSE CONFIRMATION MODAL
const closeConfirmationModal = () => {

  // RESET MODAL STATE
  confirmationModal.value = {
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Delete',
    action: null,
  };
};

// HANDLER: OPEN CONFIRMATION MODAL
const openConfirmationModal = ({ title, message, confirmLabel = 'Delete', action }) => {

  // UPDATE MODAL STATE
  confirmationModal.value = {
    open: true,
    title,
    message,
    confirmLabel,
    action,
  };
};

// HANDLER: CONFIRM PENDING ACTION
const confirmPendingAction = async () => {

  // GET CURRENT ACTION
  const action = confirmationModal.value.action;

  // CLOSE MODAL FIRST
  closeConfirmationModal();

  // RUN ACTION
  await action?.();
};

// HANDLER: START ADD LANE
const startAddLane = async () => {

  // UPDATE LANE
  addingLane.value = true;

  // WAIT ON NEXT TICK
  await nextTick();

  // SET FOCUS ON LANE
  laneInputRef.value?.focus();
};

// HANDLER: CANCEL LANE
const cancelLane = () => {

  // UPDATE LANE
  addingLane.value = false;
  newLaneName.value = '';
};

// HANDLER: SUBMIT LANE
const submitLane = async () => {

  // GET NAME OF LANE
  const name = newLaneName.value.trim();

  // STOP IF NO NAME
  if (!name) {
    return;
  }

  // TRY-CATCH BLOCK
  try {

    // CREATE LANE
    await createLane(props.board.id, name);

    // CANCEL LANE
    cancelLane();

    // EMIT REFRESH
    emit('refresh');

  // HANDLE ERRORS
  } catch (error) {

    // PRINT ERROR
    console.error('Failed to create lane', error);
  }
};

// HANDLER: HANDLE MOVE LANE
const handleMoveLane = async (lane, direction) => {

  // GET LANES
  const lanes = sortedLanes.value;

  // GET IDS
  const idx = lanes.findIndex((l) => l.id === lane.id);
  const newIdx = idx + direction;

  // STOP, IF ID IS NOT IN RANGE
  if (newIdx < 0 || newIdx >= lanes.length) {
    return;
  }

  // GET NEW POSITION
  const newPos = lanes[newIdx].position;

  // TRY-CATCH BLOCK
  try {

    // UPDATE LANE
    await updateLane(props.board.id, lane.id, { position: newPos });

    // EMIT REFRESH
    emit('refresh');

  // HANDLE ERRORS
  } catch (error) {

    // PRINT ERROR
    console.error('Failed to move lane', error);
  }
};

// HANDLER: HANDLE RENAME LANE
const handleRenameLane = async (lane, name) => {

  // TRY-CATCH BLOCK
  try {

    // UPDATE LANE
    await updateLane(props.board.id, lane.id, { name });

    // EMIT REFRESH
    emit('refresh');

  // HANDLE ERRORS
  } catch (error) {

    // PRINT ERROR
    console.error('Failed to rename lane', error);
  }
};

// HANDLER: HANDLE DELETE LANE
const handleDeleteLane = async (lane) => {

  // OPEN CONFIRMATION MODAL
  openConfirmationModal({
    title: 'Delete Lane',
    message: `Delete lane "${ lane.name }"? All tasks in this lane will be lost.`,
    confirmLabel: 'Delete Lane',
    action: async () => {
      try {
        await deleteLane(props.board.id, lane.id);
        emit('refresh');
      } catch (error) {
        console.error('Failed to delete lane', error);
      }
    },
  });
};

// HANDLER: HANDLE OPEN ADD TASK
const handleOpenAddTask = (lane) => {

  // UPDATE TASK MODAL
  taskModal.value = { open: true, task: null, lane, mode: 'create' };
};

// HANDLER: HANDLE EDIT TASK
const handleEditTask = (task, lane) => {

  // STOP, IF NO TASK AVAILABLE
  if (!task) return;

  // UPDATE TASK MODAL
  taskModal.value = { open: true, task, lane, mode: 'edit' };
};

// HANDLER: HANDLE TASK MODAL SUBMIT
const handleTaskModalSubmit = async (data) => {

  // GET TASK MODAL VALUES
  const { task, lane, mode } = taskModal.value;

  // UPDATE TRASK MODAL
  taskModal.value.open = false;

  // TRY-CATCH BLOCK
  try {

    // GET OR CREATE TASK
    if (mode === 'create') {
      await createTask(props.board.id, lane.id, data);
    } else if (task) {
      await updateTask(props.board.id, lane.id, task.id, data);
    }

    // EMIT REFRESH
    emit('refresh');

  // HANDLE ERRORS
  } catch (error) {

    // PRINT ERROR
    console.error('Failed to save task', error);
  }
};

// HANDLER: HANDLE TASK MODAL DELETE
const handleTaskModalDelete = async () => {

  // GET TASK MODAL VALUES
  const { task, lane } = taskModal.value;

  // CLOSE MODAL FIRST
  taskModal.value.open = false;

  // DELETE TASK IF AVAILABLE
  if (task && lane) {
    await handleDeleteTask(task, lane);
  }
};

// HANDLER: HANDLE DELETE TASK
const handleDeleteTask = async (task, lane) => {

  // OPEN CONFIRMATION MODAL
  openConfirmationModal({
    title: 'Delete Task',
    message: `Delete task "${ task.title }"? This cannot be undone.`,
    confirmLabel: 'Delete Task',
    action: async () => {
      try {
        await deleteTask(props.board.id, lane.id, task.id);
        emit('refresh');
      } catch (error) {
        console.error('Failed to delete task', error);
      }
    },
  });
};

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

    // GET SOURCE INDEX
    const sourceIndex = sourceLane.tasks.findIndex((laneTask) => laneTask.id === task.id);

    // STOP, IF NO INDEX
    if (sourceIndex === -1) {
      return;
    }

    // GET MOVED TASK
    const [movedTask] = sourceLane.tasks.splice(sourceIndex, 1);

    // GET BOUNDED INDEX
    const boundedIndex = Math.max(0, Math.min(newIndex, sourceLane.tasks.length));

    // POSITION MOVED TASK
    sourceLane.tasks.splice(boundedIndex, 0, movedTask);

    // SYNC ALNE
    syncLaneTaskMetadata(sourceLane);

    // RETURN
    return;
  }

  // HANDLE MOVE ACROSS LANES
  const sourceIndex = sourceLane.tasks.findIndex((laneTask) => laneTask.id === task.id);
  const targetIndex = targetLane.tasks.findIndex((laneTask) => laneTask.id === task.id);
  const boundedIndex = Math.max(0, Math.min(newIndex, targetLane.tasks.length));
  const [movedTask] = sourceIndex === -1 ? [task] : sourceLane.tasks.splice(sourceIndex, 1);

  // HANDLE TOP POSITOIN CASE
  if (targetIndex !== -1) {
    targetLane.tasks.splice(targetIndex, 1);
  }

  // POSITION MOVED TSK
  targetLane.tasks.splice(boundedIndex, 0, movedTask);

  // SYNC LANE
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

    // CHECK IF TASK MOVED IN SAME LANE
    if (originalLaneId === toLane.id) {

      // UPDATE TASK
      await updateTask(props.board.id, toLane.id, task.id, { position: newIndex });

    // IF TASK NOT MOVED WITHING SAME LANE
    } else {

      // UPFATE TASK
      await updateTask(props.board.id, originalLaneId, task.id, {
        lane_id: toLane.id,
        position: newIndex,
      });
    }

    // EMIT REFRESH
    emit('refresh');

  // HANDLE ERRORS
  } catch (errors) {

    // PRINT ERRORS
    console.error('Failed to move task', e);

    // EMIT REFRESH
    emit('refresh');
  }
};
</script>

<template>
  <div class="board-view">
    <div class="board-view__insights">
      <div class="board-view__charts">
        <section class="board-view__chart-card" aria-label="Lane distribution chart">
          <div class="board-view__chart-header">
            <div>
              <p class="board-view__chart-eyebrow">Board Insights</p>
              <h2 class="board-view__chart-title">Cards Per Lane</h2>
            </div>
            <p class="board-view__chart-summary">{{ totalTasks }} total card{{ totalTasks === 1 ? '' : 's' }}</p>
          </div>
          <div class="board-view__chart-bars">
            <div v-for="lane in laneMetrics" :key="lane.id" class="board-view__chart-row">
              <div class="board-view__chart-row-top">
                <span class="board-view__chart-lane">{{ lane.name }}</span>
                <span class="board-view__chart-value">{{ lane.taskCount }}</span>
              </div>
              <div class="board-view__chart-track">
                <div class="board-view__chart-fill" :style="{ width: `${ lane.percentage }%`, background: lane.color }"></div>
              </div>
            </div>
          </div>
        </section>
        <section class="board-view__chart-card board-view__chart-card--doughnut" aria-label="Lane share chart">
          <div class="board-view__chart-header">
            <div>
              <p class="board-view__chart-eyebrow">Board Composition</p>
              <h2 class="board-view__chart-title">Lane Share</h2>
            </div>
            <p class="board-view__chart-summary">{{ sortedLanes.length }} lane{{ sortedLanes.length === 1 ? '' : 's' }}</p>
          </div>
          <div class="board-view__doughnut-layout">
            <div class="board-view__doughnut-wrap">
              <div class="board-view__doughnut" :style="laneShareDoughnutStyle">
                <div class="board-view__doughnut-inner">
                  <span class="board-view__doughnut-value">{{ totalTasks }}</span>
                  <span class="board-view__doughnut-label">Cards</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
    <div class="board-view__lanes">
      <lane-column v-for="(lane, idx) in sortedLanes"  :key="lane.id" :lane="lane" :board-id="board.id" :is-first="idx === 0" :is-last="idx === sortedLanes.length - 1" :highlighted-task-id="highlightedTaskId"  @move="handleMoveLane" @delete="handleDeleteLane" @open-add-task="handleOpenAddTask"  @edit-task="handleEditTask"  @delete-task="handleDeleteTask" @rename-lane="handleRenameLane" @task-dropped="handleTaskDropped"/>
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
    <confirmation-modal
      :open="confirmationModal.open"
      :title="confirmationModal.title"
      :message="confirmationModal.message"
      :confirm-label="confirmationModal.confirmLabel"
      @close="closeConfirmationModal"
      @confirm="confirmPendingAction"
    />
    <task-modal v-if="taskModal.open" :task="taskModal.task" :mode="taskModal.mode" @close="taskModal.open = false" @submit="handleTaskModalSubmit" @delete="handleTaskModalDelete"/>
  </div>
</template>
