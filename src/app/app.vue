<script setup>

// IMPORTS
import './app.scss';
import { nextTick, onMounted, ref } from 'vue';
import BoardView from '@/components/board-view/board-view.vue';
import BoardDropdown from '@/components/board-dropdown/board-dropdown.vue';
import { createBoard as apiCreateBoard, deleteBoard as apiDeleteBoard, getBoard, getBoards, updateBoard as apiUpdateBoard } from '@/api/boards.js';

// SETUP STATE
const boards = ref([]);
const activeBoardId = ref(null);
const activeBoard = ref(null);
const loading = ref(false);
const toast = ref({ message: '', type: 'success' });
const boardMenuOpen = ref(false);
const isDark = ref(false);
const renameBoardOpen = ref(false);
const renameBoardName = ref('');
const renameBoardRef = ref(null);
const createBoardOpen = ref(false);
const createBoardName = ref('');
const createBoardRef = ref(null);

// DIRECTIVE: CLICK OUTSIDE
const vClickOutside = {

  // MOUNTED
  mounted: (el, binding) => {
    el._clickOutside = (e) => { if (!el.contains(e.target)) binding.value(e); };
    document.addEventListener('click', el._clickOutside, true);
  },

  // UNMOUNTED
  unmounted: (el) => {
    document.removeEventListener('click', el._clickOutside, true);
  },
};

// HANDLER: TOGGLE DARK
const toggleDark = () => {

  // TOGGLE STATE
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle('dark', isDark.value);
};

// HANDLER: SHOW TOAST
const showToast = (message, type = 'success') => {

  // DEFINE TOAST
  toast.value = { message, type };

  // REMOVE TOAST AFTER 3 SECONDS
  setTimeout(() => {
    toast.value.message = '';
   }, 3000);
};

// HANDLER: LOAD BOARDS
const loadBoards = async () => {

  // TRY-CATCH BLOCK
  try {

    // GET BOARDSA
    const res = await getBoards();

    //UPDATE BOARDS
    boards.value = res.data;

  // HANDLE ERRORS
  } catch (e) {

    // SHOW TOAST
    showToast('Failed to load boards', 'error');
  }
};

// HANDLER: LOAD BOARD
const loadBoard = async (id) => {

  // STOP IF ID IS MISSING
  if (!id) {
    return;
  }

  // UPDATE LOADING STATE
  if (!activeBoard.value) {
    loading.value = true;
  }

  // TRY-CATCH BLOCK
  try {

    // GET BOARD
    const res = await getBoard(id);
    const board = res.data;

    // UPDATE LANE IDS
    if (board.lanes) {
      board.lanes.forEach((lane) => {
        if (lane.tasks) {
          lane.tasks.forEach((task) => {
            task.lane_id = lane.id;
          });
        }
      });
    }

    // UPDATE BOARD VALUE
    activeBoard.value = board;

    // LOAD BOARDS
    await loadBoards();

  // HANDLE ERRORS
  } catch (e) {

    // SHOW TOAST
    showToast('Failed to load board', 'error');

  // FINALLY
  } finally {

    // UPDATE LOADING STATE
    loading.value = false;
  }
};

// HANDLER: SELECT BOARD
const selectBoard = async (id) => {

  // UPDATE ACTIVE BOARD ID
  activeBoardId.value = id;

  // LOAD BOARD
  await loadBoard(id);
};

// HANDLER: START RENAME BOARD
const startRenameBoard = () => {

  // UPDATE BOARD
  boardMenuOpen.value = false;
  renameBoardName.value = activeBoard.value?.name || '';
  renameBoardOpen.value = true;

  // ON NEXT TICK SET FOCUS ON BOARD
  nextTick(() => {
    renameBoardRef.value?.focus()
  });
};

// HANDLER: SUBMIT RENAME BOARD
const submitRenameBoard = async () => {

  // GET BOARD NAME
  const name = renameBoardName.value.trim();

  // STOP, IF NO NAME IS AVAILABLE
  if (!name) {
    return;
  }

  // UPDATE MODAL STATE
  renameBoardOpen.value = false;

  // TRY-CATCH BLOCK
  try {

    // UPDATE AND LOAD BOARD
    await apiUpdateBoard(activeBoardId.value, name);
    await loadBoard(activeBoardId.value);

    // SHOW TOAST
    showToast(`Board renamed to "${ name }"`);

  // HANDLE ERRORS
  } catch (e) {

    // SHOW TOAST
    showToast('Failed to rename board', 'error');
  }
};

// HANDLER: START CREATE BOARD
const startCreateBoard = () => {

  // UPDATE BOARD
  boardMenuOpen.value = false;
  createBoardName.value = '';
  createBoardOpen.value = true;

  // ON NEXT TICK SET FOCUS ON BOARD
  nextTick(() => createBoardRef.value?.focus());
};

// HANDLER: SUBMIT CREATE BOARD
const submitCreateBoard = async () => {

  // GET NAME
  const name = createBoardName.value.trim();

  // BREAK IF NO NAME FOR BOARD
  if (!name) {
    return;
  }

  // UPDATE BOARD STATE
  createBoardOpen.value = false;

  // TRY-CATCH BLOCK
  try {

    // LOAD BOARDS
    const res = await apiCreateBoard(name);
    await loadBoards();

    // SELECT BOARD
    selectBoard(res.data.id);

    // SHOW TOAST
    showToast(`Board "${ name }" created`);

  // CATCH ERRORS
  } catch (e) {

    // SHOW TOAST
    showToast('Failed to create board', 'error');
  }
};

// HANDLER: HANDLE DELETE BOARD
const handleDeleteBoard = async () => {

  // UPDATE BOARD STATE
  boardMenuOpen.value = false;

  // GET ACTIVE BOARD
  const board = activeBoard.value;

  // STOP, IF NO BOARD
  if (!board) return;

  // GET CONFITMATION IF BOARD SHOULD BE DELETED
  if (!confirm(`Delete board "${ board.name }"? This cannot be undone.`)) {
    return;
  }

  // TRY-CATCH BLOCK
  try {

    // DELETE BOARD
    await apiDeleteBoard(board.id);

    // UPDATE BOARD STATE
    activeBoardId.value = null;
    activeBoard.value = null;

    // LOAD BOARDS
    await loadBoards();

    // SHOW TOAST
    showToast(`Board "${ board.name }" deleted`);

  // HANDLE ERRORS
  } catch (e) {

    // SHOW TOASTR
    showToast('Failed to delete board', 'error');
  }
};

// HOOK: ON MOUNTED
onMounted(async () => {

  // LOAD BOARDS
  await loadBoards();

  // SELECT FIRST BOARD
  if (boards.value.length) {
    selectBoard(boards.value[0].id);
  }
});
</script>

<template>
  <div class="app">
    <header class="app__header">
      <div class="app__header-left">
        <span class="app__brand">kanbun</span>
        <div class="app__board-selector">
          <board-dropdown :boards="boards" :model-value="activeBoardId" @update:model-value="selectBoard"/>
        </div>
      </div>
      <div class="app__header-right">
        <div class="app__menu-wrap" v-if="activeBoardId">
          <button class="app__btn-icon" @click="boardMenuOpen = !boardMenuOpen" title="Board options">⋯</button>
          <div v-if="boardMenuOpen" class="app__dropdown" v-click-outside="() => boardMenuOpen = false">
            <div class="app__menu-item" @click="startRenameBoard">Rename Board</div>
            <div class="app__menu-item app__menu-item--danger" @click="handleDeleteBoard">Delete Board</div>
            <div class="app__menu-item" @click="startCreateBoard">New Board</div>
          </div>
        </div>
        <button v-else class="app__btn-icon" title="New board" @click="startCreateBoard">＋</button>
        <button class="app__btn-icon app__btn-icon--dark-toggle" @click="toggleDark" :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
          {{ isDark ? '☀' : '☽' }}
        </button>
      </div>
    </header>
    <div v-if="renameBoardOpen" class="app__modal-overlay" @click.self="renameBoardOpen = false">
      <div class="app__modal">
        <h3 class="app__modal-title">Rename Board</h3>
        <input ref="renameBoardRef" v-model="renameBoardName" class="app__modal-input" placeholder="Board name…" @keydown.enter="submitRenameBoard" @keydown.esc="renameBoardOpen = false"/>
        <div class="app__modal-actions">
          <button class="app__btn-ghost" @click="renameBoardOpen = false">Cancel</button>
          <button class="app__btn-primary" @click="submitRenameBoard">Save</button>
        </div>
      </div>
    </div>
    <div v-if="createBoardOpen" class="app__modal-overlay" @click.self="createBoardOpen = false">
      <div class="app__modal">
        <h3 class="app__modal-title">New Board</h3>
        <input ref="createBoardRef" v-model="createBoardName" class="app__modal-input" placeholder="Board name…" @keydown.enter="submitCreateBoard" @keydown.esc="createBoardOpen = false"/>
        <div class="app__modal-actions">
          <button class="app__btn-ghost" @click="createBoardOpen = false">Cancel</button>
          <button class="app__btn-primary" @click="submitCreateBoard">Create</button>
        </div>
      </div>
    </div>
    <main class="app__content">
      <template v-if="loading">
        <div class="app__state">
          <div class="app__spinner"></div>
          <p>Loading…</p>
        </div>
      </template>
      <template v-else-if="!activeBoardId">
        <div class="app__state">
          <div class="app__empty-icon">📋</div>
          <h2 class="app__state-heading">Welcome to kanbun</h2>
          <p class="app__state-text">Create a board to get started.</p>
          <button class="app__btn-primary" @click="startCreateBoard">＋ New Board</button>
        </div>
      </template>
      <template v-else-if="activeBoard">
        <board-view :board="activeBoard" @refresh="loadBoard(activeBoardId)" @delete="handleDeleteBoard"/>
      </template>
      <template v-else>
        <div class="app__state">
          <p class="app__state-text">Board not found.</p>
        </div>
      </template>
    </main>
    <div v-if="toast.message" class="app__toast" :class="`app__toast--${toast.type}`">
      {{ toast.message }}
    </div>
  </div>
</template>
