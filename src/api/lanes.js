// IMPORTS
import http from '@/api/http.js';

// FUNCTION: BASE URL
const base = (boardId) => (
	`/boards/${ boardId }/lanes`
);

// FUNCTION: GET LANES
const getLanes = (boardId) => {
	return http.get(base(boardId));
};

// FUNCTION: GET LANE
const createLane = (boardId, name) => {
	return http.post(base(boardId), { name });
};

// FUNCTION: UPDATE LANE
const updateLane = (boardId, laneId, data) => {
	return http.patch(`${ base(boardId) }/${ laneId }`, data);
};

// FUNCTION: DELETE LANE
const deleteLane = (boardId, laneId) => {
	return http.delete(`${ base(boardId) }/${ laneId }`);
};

// EXPORTS
export {
	getLanes,
	createLane,
	updateLane,
	deleteLane,
};
