// IMPORTS
import axios from 'axios';

// FUNCTION: BASE URL
const base = (boardId, laneId) => (
	`/api/boards/${ boardId }/lanes/${ laneId }/tasks`
);

// FUNCTION: GET TASKS
const getTasks = (boardId, laneId) => {
	return axios.get(base(boardId, laneId));
};

// FUNCTION: GET TASK
const createTask = (boardId, laneId, data) => {
	return axios.post(base(boardId, laneId), data);
};

// FUNCTION: UPDATE TASK
const updateTask = (boardId, laneId, taskId, data) => {
	axios.patch(`${ base(boardId, laneId) }/${ taskId }`, data);
};

// FUNCTION: DELETE TASK
const deleteTask = (boardId, laneId, taskId) => {
	return axios.delete(`${ base(boardId, laneId) }/${ taskId }`);
};

// EXPORTS
export {
	getTasks,
	createTask,
	updateTask,
	deleteTask,
};
