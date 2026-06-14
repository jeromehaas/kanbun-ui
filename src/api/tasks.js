// IMPORTS
import http from '@/lib/http.js';

// FUNCTION: BASE URL
const base = (boardId, laneId) => (
	`/boards/${ boardId }/lanes/${ laneId }/tasks`
);

// FUNCTION: GET TASKS
const getTasks = (boardId, laneId) => {

	// SEND REQUEST
	return http.get(base(boardId, laneId));
};

// FUNCTION: GET TASK
const createTask = (boardId, laneId, data) => {

	// SEND REQUEST
	return http.post(base(boardId, laneId), data);
};

// FUNCTION: UPDATE TASK
const updateTask = (boardId, laneId, taskId, data) => {

	// SEND REQUEST
	return http.patch(`${ base(boardId, laneId) }/${ taskId }`, data);
};

// FUNCTION: DELETE TASK
const deleteTask = (boardId, laneId, taskId) => {

	// SEND REQUEST
	return http.delete(`${ base(boardId, laneId) }/${ taskId }`);
};

// EXPORTS
export {
	getTasks,
	createTask,
	updateTask,
	deleteTask,
};
