// IMPORTS
import http from '@/lib/http.js';

// FUNCTION: BASE URL
const base = (boardId) => (
	`/boards/${ boardId }/lanes`
);

// FUNCTION: GET LANES
const getLanes = (boardId) => {

	// SEND REQUEST
	return http.get(base(boardId));
};

// FUNCTION: GET LANE
const createLane = (boardId, name) => {

	// SEND REQUEST
	return http.post(base(boardId), { name });
};

// FUNCTION: UPDATE LANE
const updateLane = (boardId, laneId, data) => {

	// SEND REQUEST
	return http.patch(`${ base(boardId) }/${ laneId }`, data);
};

// FUNCTION: DELETE LANE
const deleteLane = (boardId, laneId) => {

	// SEND REQUEST
	return http.delete(`${ base(boardId) }/${ laneId }`);
};

// EXPORTS
export {
	getLanes,
	createLane,
	updateLane,
	deleteLane,
};
