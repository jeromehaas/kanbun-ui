// IMPORTS
import http from '@/api/http.js';

// FUNCTION: BASE URL
const base = (boardId, laneId) => (
	`/boards/${ boardId }/lanes/${ laneId }/tasks`
);

// FUNCTION: GET TASKS
const getTasks = (boardId, laneId) => {
	return http.get(base(boardId, laneId));
};

// FUNCTION: GET TASK
const createTask = (boardId, laneId, data) => {
	return http.post(base(boardId, laneId), data);
};

// FUNCTION: UPDATE TASK
const updateTask = (boardId, laneId, taskId, data) => {
	return http.patch(`${ base(boardId, laneId) }/${ taskId }`, data);
};

// FUNCTION: DELETE TASK
const deleteTask = (boardId, laneId, taskId) => {
	return http.delete(`${ base(boardId, laneId) }/${ taskId }`);
};

// EXPORTS
export {
	getTasks,
	createTask,
	updateTask,
	deleteTask,
};
