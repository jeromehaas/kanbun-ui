// IMPORTS
import { getClientSessionId } from '@/realtime/client-session.js';

// SETUP SERVER BASE URL
const serverBaseUrl = (import.meta.env.VITE_SERVER_BASE_URL || '').replace(/\/$/, '');

// FUNCTION: GET BOARD SOCKET URL
const getBoardSocketUrl = (boardId) => {

  // USE PROXY DURING LOCAL DEVELOPMENT
  if (import.meta.env.DEV || !serverBaseUrl) {

    // GET SOCKET PROTOCOL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    // RETURN PROXIED SOCKET URL
    return `${ protocol }//${ window.location.host }/ws/boards/${ boardId }`;
  }

  // CREATE SOCKET URL FROM SERVER BASE URL
  const socketUrl = new URL(serverBaseUrl);
  socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:';

  // RETURN SOCKET URL
  return `${ socketUrl.toString().replace(/\/$/, '') }/ws/boards/${ boardId }`;
};

// FUNCTION: CREATE BOARD SOCKET MANAGER
const createBoardSocketManager = ({ getActiveBoardId, onBoardDeleted, onTaskMessage, onBoardChanged }) => {
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

      if (getActiveBoardId() === boardId && !boardSocket) {
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

    // SHOW TASK MESSAGE IF AVAILABLE
    if (message.type.startsWith('task.') && message.payload?.message) {
      onTaskMessage?.(message);
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

    // RESET EXISTING SOCKET
    closeBoardSocket();

    // CREATE SOCKET
    const socket = new WebSocket(getBoardSocketUrl(boardId));
    boardSocket = socket;

    // SEND HELLO ON OPEN
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'hello',
        client_id: getClientSessionId(),
      }));
    };

    // HANDLE SOCKET EVENTS
    socket.onmessage = handleBoardSocketMessage;
    socket.onerror = () => {
      if (socket === boardSocket) {
        socket.close();
      }
    };
    socket.onclose = () => {
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
