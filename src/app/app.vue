<script setup>

// IMPORTS
import './app.scss';
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Toaster, toast as sonnerToast } from 'vue-sonner';
import AuthPanel from '@/components/auth-panel/auth-panel.vue';
import BoardView from '@/components/board-view/board-view.vue';
import BoardDropdown from '@/components/board-dropdown/board-dropdown.vue';
import ConfirmationModal from '@/components/confirmation-modal/confirmation-modal.vue';
import SearchModal from '@/components/search-modal/search-modal.vue';
import RealtimeToastMessage from '@/components/realtime-toast-message/realtime-toast-message.vue';
import { signIn as apiSignIn, signUp as apiSignUp, verifyTwoFactor as apiVerifyTwoFactor } from '@/api/auth.js';
import { createBoard as apiCreateBoard, deleteBoard as apiDeleteBoard, getBoard, getBoards, updateBoard as apiUpdateBoard } from '@/api/boards.js';
import { searchTasks as apiSearchTasks } from '@/api/search.js';
import { clearStoredAuthSession, getStoredAuthSession, setStoredAuthSession } from '@/auth/session.js';
import { createBoardSocketManager } from '@/realtime/board-socket.js';

// CONSTANTS
const STORED_AUTH_SESSION = getStoredAuthSession();
const REALTIME_TOAST_COMPONENT = markRaw(RealtimeToastMessage);
const DEFAULT_TOAST_DURATION = 5000;
const ERROR_TOAST_DURATION = 5000;
const SEARCH_THROTTLE_DELAY = 280;
const SEARCH_HIGHLIGHT_DURATION = 4000;

// REFS: AUTHENTICATION SESSION
const authToken = ref(STORED_AUTH_SESSION.token || '');
const currentUser = ref(STORED_AUTH_SESSION.user || null);
const authMode = ref('sign-in');
const authLoading = ref(false);
const signInEmail = ref(STORED_AUTH_SESSION.user?.email || '');
const pendingVerification = ref({
  email: '',
  verificationToken: '',
});

// REFS: ACTIVE BOARD DATA
const boards = ref([]);
const activeBoardId = ref(null);
const activeBoard = ref(null);
const loading = ref(false);

// REFS: HEADER AND THEME UI
const boardMenuOpen = ref(false);
const isDark = ref(false);

// REFS: BOARD RENAME MODAL
const renameBoardOpen = ref(false);
const renameBoardName = ref('');
const renameBoardRef = ref(null);

// REFS: BOARD CREATION MODAL
const createBoardOpen = ref(false);
const createBoardName = ref('');
const createBoardRef = ref(null);

// REFS: SHARED CONFIRMATION MODAL
const confirmationModal = ref({
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Delete',
  action: null,
});

// REFS: GLOBAL SEARCH MODAL
const searchModalOpen = ref(false);
const searchQuery = ref('');
const searchResults = ref([]);
const searchLoading = ref(false);
const searchError = ref('');
const searchHasResolved = ref(false);

// REFS: TASK HIGHLIGHT AFTER SEARCH NAVIGATION
const highlightedTaskId = ref(null);

// DERIVED STATE
const isAuthenticated = computed(() => Boolean(authToken.value));
const toastTheme = computed(() => (isDark.value ? 'dark' : 'light'));

// REQUEST AND TIMER STATE
let boardLoadRequestId = 0;
let searchRequestId = 0;
let searchThrottleTimer = null;
let lastShiftKeyPressedAt = 0;
let highlightedTaskTimer = null;

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
    el._clickOutside = (event) => { if (!el.contains(event.target)) binding.value(event); };
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
    sonnerToast.error(normalizedMessage, { duration: ERROR_TOAST_DURATION });
    return;
  }

  // SHOW TOAST
  sonnerToast(normalizedMessage, { duration: DEFAULT_TOAST_DURATION });
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
    duration: type === 'error' ? ERROR_TOAST_DURATION : DEFAULT_TOAST_DURATION,
  };

  // CHECK FOR TYPE ERROR
  if (type === 'error') {

    // SHOE TOAST AND BREAK
    sonnerToast.error(REALTIME_TOAST_COMPONENT, toastPayload);
    return;
  }

  // SHOW TOAST
  sonnerToast(REALTIME_TOAST_COMPONENT, toastPayload);
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

// FUNCTION: CLEAR SEARCH THROTTLE TIMER
const clearSearchThrottleTimer = () => {

  // CLEAR TIMER IF AVAILABLE
  if (searchThrottleTimer && typeof window !== 'undefined') {
    window.clearTimeout(searchThrottleTimer);
  }

  // RESET TIMER STATE
  searchThrottleTimer = null;
};

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

// FUNCTION: CLEAR HIGHLIGHT TIMER
const clearHighlightedTaskTimer = () => {

  // CLEAR TIMER IF AVAILABLE
  if (highlightedTaskTimer && typeof window !== 'undefined') {
    window.clearTimeout(highlightedTaskTimer);
  }

  // RESET TIMER STATE
  highlightedTaskTimer = null;
};

// FUNCTION: RESET TASK SEARCH STATE
const resetTaskSearchState = () => {

  // INVALIDATE IN-FLIGHT REQUESTS
  searchRequestId += 1;

  // RESET SEARCH UI STATE
  searchQuery.value = '';
  searchResults.value = [];
  searchLoading.value = false;
  searchError.value = '';
  searchHasResolved.value = false;
  lastShiftKeyPressedAt = 0;

  // CLEAR PENDING TIMER
  clearSearchThrottleTimer();
};

// HANDLER: CLOSE SEARCH MODAL
const closeSearchModal = () => {

  // UPDATE SEARCH UI
  searchModalOpen.value = false;
  resetTaskSearchState();
};

// HANDLER: OPEN SEARCH MODAL
const openSearchModal = () => {

  // STOP, IF USER IS NOT AUTHENTICATED
  if (!isAuthenticated.value) {
    return;
  }

  // OPEN MODAL
  searchModalOpen.value = true;
  searchError.value = '';
  searchHasResolved.value = false;
};

// FUNCTION: CHECK IF TARGET IS EDITABLE
const isEditableTarget = (target) => {

  // RETURN
  return target instanceof HTMLElement && (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  );
};

// FUNCTION: SCROLL TO TASK CARD
const scrollToTaskCard = (taskId) => {

  // GET TASK ELEMENT
  const taskElement = document.querySelector(`[data-task-id="${ taskId }"]`);

  // STOP, IF TASK ELEMENT IS NOT AVAILABLE
  if (!taskElement) {
    return;
  }

  // SCROLL TASK INTO VIEW
  taskElement.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'center',
  });
};

// FUNCTION: FOCUS TASK CARD
const focusTaskCard = async (taskId) => {

  // STOP, IF NO TASK ID IS AVAILABLE
  if (!taskId) {
    return;
  }

  // HIGHLIGHT THE SELECTED TASK
  highlightedTaskId.value = taskId;

  // WAIT FOR THE BOARD TO RENDER
  await nextTick();

  // SCROLL AND AUTO-CLEAR THE HIGHLIGHT
  if (typeof window !== 'undefined') {
    window.requestAnimationFrame(() => scrollToTaskCard(taskId));
    clearHighlightedTaskTimer();
    highlightedTaskTimer = window.setTimeout(() => {
      if (highlightedTaskId.value === taskId) {
        highlightedTaskId.value = null;
      }

      highlightedTaskTimer = null;
    }, SEARCH_HIGHLIGHT_DURATION);
  }
};

// FUNCTION: RUN TASK SEARCH
const runTaskSearch = async (query) => {

  // TRACK THE REQUEST
  const requestId = ++searchRequestId;
  searchLoading.value = true;
  searchError.value = '';

  // TRY TO SEARCH TASKS
  try {
    const res = await apiSearchTasks(query);

    // STOP, IF THE REQUEST IS STALE
    if (requestId !== searchRequestId || !searchModalOpen.value || searchQuery.value.trim() !== query) {
      return;
    }

    // UPDATE SEARCH RESULTS
    searchResults.value = res.data;
    searchHasResolved.value = true;

  // HANDLE ERRORS
  } catch (error) {
    if (requestId !== searchRequestId || isUnauthorizedError(error)) {
      return;
    }

    searchError.value = getApiErrorMessage(error, 'Failed to search cards');
    searchHasResolved.value = true;

  // FINALLY
  } finally {
    if (requestId === searchRequestId) {
      searchLoading.value = false;
    }
  }
};

// FUNCTION: FLUSH TASK SEARCH
const flushTaskSearch = async () => {

  // CLEAR THE THROTTLE TIMER
  clearSearchThrottleTimer();

  // GET THE CURRENT QUERY
  const query = searchQuery.value.trim();

  // STOP, IF THERE IS NOTHING TO SEARCH
  if (!searchModalOpen.value || !query) {
    return;
  }

  // RUN SEARCH
  await runTaskSearch(query);
};

// FUNCTION: SCHEDULE TASK SEARCH
const scheduleTaskSearch = () => {

  // GET TRIMMED QUERY
  const query = searchQuery.value.trim();
  searchError.value = '';
  clearSearchThrottleTimer();

  // RESET RESULTS FOR EMPTY SEARCHES
  if (!searchModalOpen.value || !query) {
    searchRequestId += 1;
    searchResults.value = [];
    searchLoading.value = false;
    searchHasResolved.value = false;
    return;
  }

  // MARK THE CURRENT QUERY AS PENDING
  searchHasResolved.value = false;

  // START A FRESH DELAY WINDOW
  if (typeof window !== 'undefined') {
    searchThrottleTimer = window.setTimeout(() => {
      void flushTaskSearch();
    }, SEARCH_THROTTLE_DELAY);
  }
};

// HANDLER: GLOBAL KEYDOWN
const handleGlobalKeydown = (event) => {

  // STOP, IF THE SHORTCUT DOES NOT APPLY
  if (
    !isAuthenticated.value ||
    event.key !== 'Shift' ||
    event.repeat ||
    isEditableTarget(event.target)
  ) {
    return;
  }

  // CHECK FOR DOUBLE-SHIFT
  const pressedAt = Date.now();

  if (pressedAt - lastShiftKeyPressedAt <= 300) {
    event.preventDefault();
    lastShiftKeyPressedAt = 0;
    openSearchModal();
    return;
  }

  // TRACK THE LATEST SHIFT PRESS
  lastShiftKeyPressedAt = pressedAt;
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

  // RESET SEARCH AND HIGHLIGHT STATE
  closeSearchModal();
  clearHighlightedTaskTimer();
  highlightedTaskId.value = null;

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
  } catch (error) {

    // FOR AUTH ERRORS
    if (!isUnauthorizedError(error)) {

      // SHOWN TOAST
      showToast(getApiErrorMessage(error, 'Failed to load boards'), 'error');
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
  } catch (error) {
    if (requestId === boardLoadRequestId && !isUnauthorizedError(error)) {
      showToast(getApiErrorMessage(error, 'Failed to load board'), 'error');
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

// HANDLER: HANDLE SEARCH RESULT SELECTED
const handleSearchResultSelected = async (result) => {

  // CLOSE THE SEARCH MODAL FIRST
  closeSearchModal();

  // STOP, IF THE RESULT IS INVALID
  if (!result?.task_id || !result?.board_id) {
    return;
  }

  // LOAD THE TARGET BOARD IF NEEDED
  if (activeBoardId.value !== result.board_id) {
    await selectBoard(result.board_id);
  }

  // FOCUS THE MATCHED TASK
  await focusTaskCard(result.task_id);
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
  } catch (error) {

    // SHOW ERROR TOAST
    showToast(getApiErrorMessage(error, 'Failed to sign in'), 'error');

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
  } catch (error) {

    // GET ERROR MESSAGE
    const message = getApiErrorMessage(error, 'Failed to verify code');

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

// WATCH: TASK SEARCH QUERY
watch(searchQuery, () => {
  scheduleTaskSearch();
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
  } catch (error) {

    // CHECK FOR AUTH ERROR
    if (!isUnauthorizedError(error)) {

      // SHOW TOAST
      showToast(getApiErrorMessage(error, 'Failed to rename board'), 'error');
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
  } catch (error) {

    // CHECK FOR AUTH ERROR
    if (!isUnauthorizedError(error)) {

      // SHOW TOAST
      showToast(getApiErrorMessage(error, 'Failed to create board'), 'error');
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

  // OPEN CONFIRMATION MODAL
  openConfirmationModal({
    title: 'Delete Board',
    message: `Delete board "${ board.name }"? This cannot be undone.`,
    confirmLabel: 'Delete Board',
    action: async () => {
      try {
        await apiDeleteBoard(board.id);
        activeBoardId.value = null;
        activeBoard.value = null;
        await loadBoards();
        showToast(`Board "${ board.name }" deleted`);
      } catch (error) {
        if (!isUnauthorizedError(error)) {
          showToast(getApiErrorMessage(error, 'Failed to delete board'), 'error');
        }
      }
    },
  });
};

// HOOK: ON MOUNTED
onMounted(async () => {

  // LISTEN FOR EXPIRED SESSIONS
  window.addEventListener('kanbun:unauthorized', handleUnauthorizedSession);
  window.addEventListener('keydown', handleGlobalKeydown);

  // RESTORE SESSION IF AVAILABLE
  if (isAuthenticated.value) {
    await loadAuthenticatedWorkspace();
  }
});

// HOOK: ON BEFORE UNMOUNT
onBeforeUnmount(() => {

  // CLOSE SOCKET
  closeBoardSocket();

  // CLEAR SEARCH TIMERS
  clearSearchThrottleTimer();
  clearHighlightedTaskTimer();

  // CLEAN UP GLOBAL LISTENER
  window.removeEventListener('kanbun:unauthorized', handleUnauthorizedSession);
  window.removeEventListener('keydown', handleGlobalKeydown);
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
        <board-view :board="activeBoard" :highlighted-task-id="highlightedTaskId" @refresh="loadBoard(activeBoardId)" @delete="handleDeleteBoard"/>
      </template>
      <template v-else>
        <div class="app__state">
          <p class="app__state-text">Board not found.</p>
        </div>
      </template>
    </main>
    <confirmation-modal :open="confirmationModal.open" :title="confirmationModal.title" :message="confirmationModal.message" :confirm-label="confirmationModal.confirmLabel" @close="closeConfirmationModal" @confirm="confirmPendingAction" />
    <search-modal :open="searchModalOpen" :query="searchQuery" :results="searchResults" :loading="searchLoading"  :error="searchError" :has-searched="searchHasResolved" @close="closeSearchModal"  @update:query="searchQuery = $event" @select="handleSearchResultSelected" />
    <toaster position="bottom-right" :theme="toastTheme" :visible-toasts="6" :gap="10" expand close-button close-button-position="top-right" />
  </div>
</template>
