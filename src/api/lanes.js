// IMPORTS
import axios from 'axios';

// FUNCTION: BASE URL
const base = (boardId) => (
	`/api/boards/${ boardId }/lanes`
);

// FUNCTION: GET LANES
const getLanes = (boardId) => {
	return axios.get(base(boardId));
};

// FUNCTION: GET LANE
const createLane = (boardId, name) => {
	return axios.post(base(boardId), { name });
};

// FUNCTION: UPDATE LANE
const updateLane = (boardId, laneId, data) => {
	return axios.patch(`${ base(boardId) }/${ laneId }`, data);
};

// FUNCTION: DELETE LANE
const deleteLane = (boardId, laneId) => {
	return axios.delete(`${ base(boardId) }/${ laneId }`);
};

// EXPORTS
export {
	getLanes,
	createLane,
	updateLane,
	deleteLane,
};
