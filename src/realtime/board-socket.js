// IMPORTS
import { getStoredAuthToken } from '@/auth/session.js';
import { getClientSessionId } from '@/realtime/client-session.js';

// SETUP SERVER BASE URL
const serverBaseUrl = (import.meta.env.VITE_SERVER_BASE_URL || '').replace(/\/$/, '');

// FUNCTION: GET BOARD SOCKET URL
const getBoardSocketUrl = (boardId) => {

  // GET AUTH TOKEN
  const authToken = getStoredAuthToken();

  // STOP, IF NO AUTH TOKEN IS AVAILABLE
  if (!authToken) {
    return null;
  }

  // USE THE DEV PROXY ONLY WHEN NO EXPLICIT SERVER URL EXISTS
  if (!serverBaseUrl) {

    // BUILD PROXIED SOCKET URL
    const socketUrl = new URL(
      `/ws/boards/${ boardId }`,
      `${ window.location.protocol === 'https:' ? 'wss:' : 'ws:' }//${ window.location.host }`
    );

    // SET TOKEN TO SEARCH PARAMS
    socketUrl.searchParams.set('token', authToken);

    // RETURN
    return socketUrl.toString();
  }

  // CREATE SOCKET URL FROM SERVER BASE URL
  const socketUrl = new URL(serverBaseUrl);
  socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  socketUrl.pathname = `/ws/boards/${ boardId }`;
  socketUrl.searchParams.set('token', authToken);

  // RETURN
  return socketUrl.toString();
};

// FUNCTION: CREATE BOARD SOCKET MANAGER
const createBoardSocketManager = ({ getActiveBoardId, onBoardDeleted, onRealtimeMessage, onBoardChanged }) => {

  // GET BOARD SOCKET AND RECONNECT TIMER
  let boardSocket = null;
  let boardSocketReconnectTimer = null;

  // FUNCTION: CLEAR SOCKET RECONNECT TIMER
  const clearBoardSocketReconnectTimer = () => {

    // STOP, IF NO TIMER IS ACTIVE
    if (!boardSocketReconnectTimer) {
      return;
    }

    // CLEAR TIMER
    window.clearTimeout(boardSocketReconnectTimer);
    boardSocketReconnectTimer = null;
  };

  // FUNCTION: CLOSE BOARD SOCKET
  const closeBoardSocket = () => {

    // CLEAR RECONNECT TIMER
    clearBoardSocketReconnectTimer();

    // STOP, IF NO SOCKET IS AVAILABLE
    if (!boardSocket) {
      return;
    }

    // CLOSE SOCKET WITHOUT RECONNECTING
    const socket = boardSocket;
    boardSocket = null;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    socket.close();
  };

  // FUNCTION: SCHEDULE BOARD SOCKET RECONNECT
  const scheduleBoardSocketReconnect = (boardId) => {

    // STOP, IF BOARD IS NOT AVAILABLE OR RECONNECT ALREADY EXISTS
    if (!boardId || boardSocketReconnectTimer || typeof window === 'undefined') {
      return;
    }

    // RECONNECT AFTER SHORT DELAY
    boardSocketReconnectTimer = window.setTimeout(() => {
      boardSocketReconnectTimer = null;

      // CHECK FOR BOARD ID
      if (getActiveBoardId() === boardId && !boardSocket) {

        // CONNECT TO BOARD SOCKET
        connectBoardSocket(boardId);
      }
    }, 1500);
  };

  // FUNCTION: HANDLE BOARD SOCKET MESSAGE
  const handleBoardSocketMessage = async (event) => {

    // PARSE MESSAGE
    let message;

    // TRY-CATCH BLOCK
    try {
      message = JSON.parse(event.data);
    
    // HANDLE ERRORS
    } catch {
      
      // BREAK
      return;
    }

    // IGNORE INVALID OR OWN EVENTS
    if (!message?.type || message.source_client_id === getClientSessionId()) {
      return;
    }

    // HANDLE BOARD DELETION
    if (message.type === 'board.deleted') {
      
      // CLOSE BOARD
      closeBoardSocket();
      
      // CALLBACK FOR DELETED BOARD
      await onBoardDeleted?.(message);
      
      // BREAK
      return;
    }

    // SHOW REALTIME MESSAGE IF AVAILABLE
    if (message.payload?.message) {
      onRealtimeMessage?.(message);
    }

    // REFRESH CURRENT BOARD
    if (message.board_id && getActiveBoardId() === message.board_id) {
      await onBoardChanged?.(message);
    }
  };

  // FUNCTION: CONNECT BOARD SOCKET
  const connectBoardSocket = (boardId) => {

    // STOP, IF BOARD IS NOT AVAILABLE
    if (!boardId || typeof window === 'undefined') {
      return;
    }

    // BUILD SOCKET URL WITH AUTH TOKEN
    const socketUrl = getBoardSocketUrl(boardId);

    // STOP, IF NO SOCKET URL IS AVAILABLE
    if (!socketUrl) {
      return;
    }

    // RESET EXISTING SOCKET
    closeBoardSocket();

    // CREATE SOCKET
    const socket = new WebSocket(socketUrl);
    boardSocket = socket;

    // SEND HELLO ON OPEN
    socket.onopen = () => {

      // SEND HELLO
      socket.send(JSON.stringify({
        type: 'hello',
        client_id: getClientSessionId(),
      }));
    };

    // HANDLE SOCKET ON MESSAGE
    socket.onmessage = handleBoardSocketMessage;

    // HANDLE SOCKET ON ERROR
    socket.onerror = () => {

      // CLOSE SOCKET
      if (socket === boardSocket) {
        socket.close();
      }
    };

    // HANDLE SOCKET ON CLOSE
    socket.onclose = () => {

      // RESET SOCKET BOARD
      if (socket === boardSocket) {
        boardSocket = null;
        scheduleBoardSocketReconnect(boardId);
      }
    };
  };

  // EXPORTS
  return {
    closeBoardSocket,
    connectBoardSocket,
  };
};

// EXPORTS
export {
  createBoardSocketManager,
};
