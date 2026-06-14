<script setup>

// IMPORTS
import './app.scss';
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Toaster, toast as sonnerToast } from 'vue-sonner';
import AuthPanel from '@/components/auth-panel/auth-panel.vue';
import BoardView from '@/components/board-view/board-view.vue';
import BoardDropdown from '@/components/board-dropdown/board-dropdown.vue';
import RealtimeToastMessage from '@/components/realtime-toast-message/realtime-toast-message.vue';
import { signIn as apiSignIn, signUp as apiSignUp, verifyTwoFactor as apiVerifyTwoFactor } from '@/api/auth.js';
import { createBoard as apiCreateBoard, deleteBoard as apiDeleteBoard, getBoard, getBoards, updateBoard as apiUpdateBoard } from '@/api/boards.js';
import { clearStoredAuthSession, getStoredAuthSession, setStoredAuthSession } from '@/auth/session.js';
import { createBoardSocketManager } from '@/realtime/board-socket.js';

// SETUP AUTH STATE
const storedAuthSession = getStoredAuthSession();
const authToken = ref(storedAuthSession.token || '');
const currentUser = ref(storedAuthSession.user || null);
const authMode = ref('sign-in');
const authLoading = ref(false);
const signInEmail = ref(storedAuthSession.user?.email || '');
const pendingVerification = ref({
  email: '',
  verificationToken: '',
});

// SETUP APP STATE
const boards = ref([]);
const activeBoardId = ref(null);
const activeBoard = ref(null);
const loading = ref(false);
const boardMenuOpen = ref(false);
const isDark = ref(false);
const renameBoardOpen = ref(false);
const renameBoardName = ref('');
const renameBoardRef = ref(null);
const createBoardOpen = ref(false);
const createBoardName = ref('');
const createBoardRef = ref(null);
const isAuthenticated = computed(() => Boolean(authToken.value));
const toastTheme = computed(() => (isDark.value ? 'dark' : 'light'));
const realtimeToastComponent = markRaw(RealtimeToastMessage);
const defaultToastDuration = 5000;
const errorToastDuration = 6500;
let boardLoadRequestId = 0;

// FUNCTION: NORMALIZE TOAST MESSAGE
const normalizeToastMessage = (message) => {

  // GET TRIMMED MESSAGE
  const trimmedMessage = message?.trim() || '';

  // CHECK FOR MESSAGE
  if (!trimmedMessage) {
    return '';
  }

  // RETURN
  return trimmedMessage.endsWith('.')
    ? trimmedMessage
    : `${ trimmedMessage }.`;
};

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

  // DISABLE TRANSITIONS DURING THEME FLIP
  document.documentElement.classList.add('theme-switching');

  // TOGGLE STATE
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle('dark', isDark.value);

  // RE-ENABLE TRANSITIONS AFTER THE THEME UPDATE PAINTS
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.documentElement.classList.remove('theme-switching');
    });
  });
};

// HANDLER: SHOW TOAST
const showToast = (message, type = 'default') => {

  // NORMALIZE TOAST COPY
  const normalizedMessage = normalizeToastMessage(message);

  // STOP, IF NO MESSAGE IS AVAILABLE
  if (!normalizedMessage) {
    return;
  }

  // SHOW TOAST ON ERROR
  if (type === 'error') {
    sonnerToast.error(normalizedMessage, { duration: errorToastDuration });
    return;
  }

  // SHOW TOAST
  sonnerToast(normalizedMessage, { duration: defaultToastDuration });
};

// FUNCTION: GET REALTIME ENTITY LABEL
const getRealtimeEntityLabel = (message) => {

  // CHECK IF IT'S A TASK TYPE
  if (message.type.startsWith('task.')) {
    return message.payload?.title || '';
  }

  // CHECK IF IT'S A LANE TYPE
  if (message.type.startsWith('lane.') || message.type.startsWith('board.')) {
    return message.payload?.name || '';
  }

  // RETURN
  return '';
};

// HANDLER: SHOW REALTIME TOAST
const showRealtimeToast = (message, type = 'default') => {

  // GET TOAST MESSAGE
  const toastMessage = normalizeToastMessage(message?.payload?.message);

  // STOP IF NO MESSAGE
  if (!toastMessage) {
    return;
  }

  // GET ACTOR AND ENTITY LABEL
  const actor = message.payload?.actor?.username || '';
  const entity = getRealtimeEntityLabel(message);

  // CHECK FOR ACTOR AND ENTITY
  if (!actor && !entity) {

    // SHOW TOAST AND BREAK
    showToast(toastMessage, type);
    return;
  }

  // DEFINE TOAST PAYLOAD
  const toastPayload = {
    componentProps: {
      message: toastMessage,
      actor,
      entity,
    },
    duration: type === 'error' ? errorToastDuration : defaultToastDuration,
  };

  // CHECK FOR TYPE ERROR
  if (type === 'error') {

    // SHOE TOAST AND BREAK
    sonnerToast.error(realtimeToastComponent, toastPayload);
    return;
  }

  // SHOW TOAST
  sonnerToast(realtimeToastComponent, toastPayload);
};

// FUNCTION: CHECK UNAUTHORIZED ERROR
const isUnauthorizedError = (error) => {

  // RETURN
  return error?.response?.status === 401;
};

// FUNCTION: GET API ERROR MESSAGE
const getApiErrorMessage = (error, fallback) => {

    // RETURN
    return  error?.response?.data?.ERROR || fallback;
};

// FUNCTION: GET ACTIVE BOARD ID
const getActiveBoardId = () => {

  // RETURN
  return activeBoardId.value;
};

// HANDLER: BOARD DELETED
const handleBoardDeleted = async (message) => {

  // SHOW TOAST
  showRealtimeToast(message, 'error');

  // RESET ACTIVE BOARD
  activeBoardId.value = null;
  activeBoard.value = null;

  // LOAD BOARDS
  await loadBoards();
};

// HANDLER: REALTIME MESSAGE
const handleRealtimeMessage = (message) => {

  // SHOW TOAST
  showRealtimeToast(message);
};

// HANDLER: BOARD CHANGED
const handleBoardChanged = async (message) => {

  // LOAD BOARD
  await loadBoard(message.board_id);
};

// SETUP BOARD SOCKET MANAGER
const { closeBoardSocket, connectBoardSocket } = createBoardSocketManager({
  getActiveBoardId,
  onBoardDeleted: handleBoardDeleted,
  onRealtimeMessage: handleRealtimeMessage,
  onBoardChanged: handleBoardChanged,
});

// FUNCTION: RESET BOARD STATE
const resetBoardState = () => {

  // INVALIDATE IN-FLIGHT REQUESTS
  boardLoadRequestId += 1;

  // CLOSE SOCKETS AND RESET UI
  closeBoardSocket();
  boards.value = [];
  activeBoardId.value = null;
  activeBoard.value = null;
  loading.value = false;
  boardMenuOpen.value = false;
  renameBoardOpen.value = false;
  createBoardOpen.value = false;
};

// FUNCTION: RESET PENDING VERIFICATION
const resetPendingVerification = () => {
  pendingVerification.value = {
    email: '',
    verificationToken: '',
  };
};

// HANDLER: SWITCH AUTH MODE
const switchAuthMode = (mode) => {

  // UPDATE MODE
  authMode.value = mode;

  // CLEAR PENDING VERIFICATION WHEN LEAVING 2FA STEP
  if (mode !== 'verify') {
    resetPendingVerification();
  }
};

// FUNCTION: LOAD BOARDS
const loadBoards = async () => {

  // STOP, IF USER IS NOT AUTHENTICATED
  if (!isAuthenticated.value) {
    boards.value = [];
    return;
  }

  // TRY-CATCH BLOCK
  try {

    // GET BOARDS
    const res = await getBoards();

    // UPDATE BOARDS
    boards.value = res.data;

  // HANDLE ERRORS
  } catch (e) {

    // FOR AUTH ERRORS
    if (!isUnauthorizedError(e)) {

      // SHOWN TOAST
      showToast(getApiErrorMessage(e, 'Failed to load boards'), 'error');
    }
  }
};

// HANDLER: LOAD BOARD
const loadBoard = async (id) => {

  // STOP IF ID IS MISSING OR USER IS NOT AUTHENTICATED
  if (!id || !isAuthenticated.value) {
    activeBoard.value = null;
    return;
  }

  // TRACK LATEST REQUEST
  const requestId = ++boardLoadRequestId;

  // UPDATE LOADING STATE
  if (!activeBoard.value) {
    loading.value = true;
  }

  // TRY-CATCH BLOCK
  try {

    // GET BOARD
    const res = await getBoard(id);

    // STOP, IF REQUEST IS STALE
    if (requestId !== boardLoadRequestId || activeBoardId.value !== id) {
      return;
    }

    // GET BOARD
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
    if (requestId === boardLoadRequestId && !isUnauthorizedError(e)) {
      showToast(getApiErrorMessage(e, 'Failed to load board'), 'error');
    }

  // FINALLY
  } finally {

    // UPDATE LOADING STATE
    if (requestId === boardLoadRequestId) {
      loading.value = false;
    }
  }
};

// HANDLER: SELECT BOARD
const selectBoard = async (id) => {

  // STOP, IF USER IS NOT AUTHENTICATED
  if (!isAuthenticated.value) {
    return;
  }

  // UPDATE ACTIVE BOARD ID
  activeBoardId.value = id;

  // LOAD BOARD
  await loadBoard(id);
};

// FUNCTION: LOAD AUTHENTICATED WORKSPACE
const loadAuthenticatedWorkspace = async () => {

  // RESET BOARD-SPECIFIC STATE FIRST
  resetBoardState();

  // LOAD LATEST BOARDS
  await loadBoards();

  // SELECT FIRST BOARD IF AVAILABLE
  if (boards.value.length) {
    await selectBoard(boards.value[0].id);
  }
};

// FUNCTION: APPLY AUTHENTICATED SESSION
const applyAuthenticatedSession = async ({ token, user }) => {

  // SAVE SESSION LOCALLY
  authToken.value = token;
  currentUser.value = user;
  signInEmail.value = user?.email || signInEmail.value;

  // SET STORED AUTH SESSION
  setStoredAuthSession({ token, user });

  // RESET PENDING AUTH STATE
  resetPendingVerification();

  // UPDATE AUTH MODE
  authMode.value = 'sign-in';

  // LOAD AUTHENTICATED APP DATA
  await loadAuthenticatedWorkspace();
};

// FUNCTION: RESET AUTHENTICATED SESSION
const resetAuthenticatedSession = ({ message = '', type = 'success' } = {}) => {

  // GET LAST KNOWN EMAIL
  const lastKnownEmail = currentUser.value?.email || signInEmail.value;

  // CLEAR SESSION STATE
  authToken.value = '';
  currentUser.value = null;
  signInEmail.value = lastKnownEmail;

  // CLEAR SESSION
  clearStoredAuthSession();

  // RESET VERIFICATION AND AUTH MODE
  resetPendingVerification();
  switchAuthMode('sign-in');
  resetBoardState();

  // SHOW OPTIONAL TOAST
  if (message) {
    showToast(message, type);
  }
};

// HANDLER: SIGN OUT
const signOut = () => {

  // RESET AUTH SESSION
  resetAuthenticatedSession({
    message: 'Signed out successfully.',
    type: 'success',
  });
};

// HANDLER: SIGN UP
const submitSignUp = async ({ username, email, password }) => {

  // UPDATE LOADING STATE
  authLoading.value = true;

  // TRY-CATCH BLOCK
  try {

    // SIGN UP
    await apiSignUp({ username, email, password });

    // GET EMAIL
    signInEmail.value = email.trim().toLowerCase();

    // SHOW AUTH MODE
    switchAuthMode('sign-in');

    // SHOW TOAST
    showToast('Account created. Sign in to continue.');

  // HANDLE ERRORS
  } catch (error) {

    // SHOW ERROR TOAST
    showToast(getApiErrorMessage(error, 'Failed to create account'), 'error');

  // FINALLY
  } finally {

    // UPDATE LOADING STATE
    authLoading.value = false;
  }
};

// HANDLER: SIGN IN
const submitSignIn = async ({ email, password }) => {

  // UPDATE LOADING STATE
  authLoading.value = true;

  // TRY-CATCH BLOCK
  try {

    // SIGN IN
    const res = await apiSignIn(email, password);

    // GET EMAIL VALUE
    signInEmail.value = email.trim().toLowerCase();

    // GET VERIFICATION
    pendingVerification.value = {
      email: res.data.email,
      verificationToken: res.data.verification_token,
    };

    //  UPDATE AUTH MODE
    authMode.value = 'verify';

    // SHOW TOAST
    showToast(`Verification code sent to ${ res.data.email }.`);

  // HANDLE ERRORS
  } catch (e) {

    // SHOW ERROR TOAST
    showToast(getApiErrorMessage(e, 'Failed to sign in'), 'error');

  // FINALLY
  } finally {

    // UPDATE LOADING STATE
    authLoading.value = false;
  }
};

// HANDLER: VERIFY TWO-FACTOR CODE
const submitTwoFactor = async ({ code }) => {

  // CHECK FOR FAILING VERIFICATION TOKEN
  if (!pendingVerification.value.verificationToken) {

    // SWICH AUTH MODE
    switchAuthMode('sign-in');

    // SHOW TOASTj
    showToast('Sign in first to request a verification code.', 'error');

    // RETURN
    return;
  }

  // UPDATE LOADING STATE
  authLoading.value = true;

  // TRY-CATCH BLOCK
  try {

    // VERIFY AUTH
    const res = await apiVerifyTwoFactor(pendingVerification.value.verificationToken, code);

    // APPlY AUTH SESSION
    await applyAuthenticatedSession({
      token: res.data.token,
      user: res.data.user,
    });

    // SHOW TOAST
    showToast(`Welcome back, ${ res.data.user.username }.`);

  // HANDLE ERRORS
  } catch (e) {

    // GET ERROR MESSAGE
    const message = getApiErrorMessage(e, 'Failed to verify code');

    // DEFINE MESSAGE FOR EXPIRRED OR INVALID SESSION
    if (message === 'SIGN-IN SESSION EXPIRED OR INVALID') {
      switchAuthMode('sign-in');
    }

    // SHOW ERROR TOEAST
    showToast(message, 'error');

  // FINALLY
  } finally {

    // UPDATE LOADING STATE
    authLoading.value = false;
  }
};

// HANDLER: SESSION EXPIRED
const handleUnauthorizedSession = (event) => {

  // RESET AUTH SESSION
  resetAuthenticatedSession({
    message: event.detail?.message || 'Your session expired. Please sign in again.',
    type: 'error',
  });
};

// WATCH: ACTIVE BOARD SOCKET
watch(activeBoardId, (boardId) => {

  // CLOSE PREVIOUS SOCKET
  closeBoardSocket();

  // CONNECT NEW SOCKET
  if (boardId && isAuthenticated.value) {
    connectBoardSocket(boardId);
  }
});

// HANDLER: START RENAME BOARD
const startRenameBoard = () => {

  // UPDATE BOARD
  boardMenuOpen.value = false;
  renameBoardName.value = activeBoard.value?.name || '';
  renameBoardOpen.value = true;

  // ON NEXT TICK SET FOCUS ON BOARD
  nextTick(() => {
    renameBoardRef.value?.focus();
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

    // CHECK FOR AUTH ERROR
    if (!isUnauthorizedError(e)) {

      // SHOW TOAST
      showToast(getApiErrorMessage(e, 'Failed to rename board'), 'error');
    }
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
    await selectBoard(res.data.id);

    // SHOW TOAST
    showToast(`Board "${ name }" created`);

  // CATCH ERRORS
  } catch (e) {

    // CHECK FOR AUTH ERROR
    if (!isUnauthorizedError(e)) {

      // SHOW TOAST
      showToast(getApiErrorMessage(e, 'Failed to create board'), 'error');
    }
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

    // CHECK FOR AUTH ERROR
    if (!isUnauthorizedError(e)) {

      // SHOW TOAST
      showToast(getApiErrorMessage(e, 'Failed to delete board'), 'error');
    }
  }
};

// HOOK: ON MOUNTED
onMounted(async () => {

  // LISTEN FOR EXPIRED SESSIONS
  window.addEventListener('kanbun:unauthorized', handleUnauthorizedSession);

  // RESTORE SESSION IF AVAILABLE
  if (isAuthenticated.value) {
    await loadAuthenticatedWorkspace();
  }
});

// HOOK: ON BEFORE UNMOUNT
onBeforeUnmount(() => {

  // CLOSE SOCKET
  closeBoardSocket();

  // CLEAN UP GLOBAL LISTENER
  window.removeEventListener('kanbun:unauthorized', handleUnauthorizedSession);
});
</script>

<template>
  <div class="app">
    <header class="app__header">
      <div class="app__header-left">
        <span class="app__brand">kanbun</span>
        <div v-if="isAuthenticated" class="app__board-selector">
          <board-dropdown :boards="boards" :model-value="activeBoardId" @update:model-value="selectBoard"/>
        </div>
      </div>
      <div class="app__header-right">
        <span v-if="currentUser" class="app__user-pill">{{ currentUser.username }}</span>
        <div class="app__menu-wrap" v-if="isAuthenticated && activeBoardId">
          <button class="app__btn-icon" @click="boardMenuOpen = !boardMenuOpen" title="Board options">⋯</button>
          <div v-if="boardMenuOpen" class="app__dropdown" v-click-outside="() => boardMenuOpen = false">
            <div class="app__menu-item" @click="startRenameBoard">Rename Board</div>
            <div class="app__menu-item app__menu-item--danger" @click="handleDeleteBoard">Delete Board</div>
            <div class="app__menu-item" @click="startCreateBoard">New Board</div>
          </div>
        </div>
        <button v-else-if="isAuthenticated" class="app__btn-icon" title="New board" @click="startCreateBoard">＋</button>
        <button v-if="isAuthenticated" class="app__btn-ghost app__btn-ghost--header" @click="signOut">Sign out</button>
        <button class="app__btn-icon app__btn-icon--dark-toggle" @click="toggleDark" :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
          {{ isDark ? '☀' : '☽' }}
        </button>
      </div>
    </header>
    <div v-if="isAuthenticated && renameBoardOpen" class="app__modal-overlay" @click.self="renameBoardOpen = false">
      <div class="app__modal">
        <h3 class="app__modal-title">Rename Board</h3>
        <input ref="renameBoardRef" v-model="renameBoardName" class="app__modal-input" placeholder="Board name…" @keydown.enter="submitRenameBoard" @keydown.esc="renameBoardOpen = false"/>
        <div class="app__modal-actions">
          <button class="app__btn-ghost" @click="renameBoardOpen = false">Cancel</button>
          <button class="app__btn-primary" @click="submitRenameBoard">Save</button>
        </div>
      </div>
    </div>
    <div v-if="isAuthenticated && createBoardOpen" class="app__modal-overlay" @click.self="createBoardOpen = false">
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
      <auth-panel
        v-if="!isAuthenticated"
        :mode="authMode"
        :loading="authLoading"
        :sign-in-email="signInEmail"
        :verification-email="pendingVerification.email"
        @switch-mode="switchAuthMode"
        @sign-up="submitSignUp"
        @sign-in="submitSignIn"
        @verify="submitTwoFactor"
      />
      <template v-else-if="loading">
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
    <Toaster
      position="bottom-right"
      :theme="toastTheme"
      :visible-toasts="6"
      :gap="10"
      expand
      close-button
      close-button-position="top-right"
    />
  </div>
</template>
