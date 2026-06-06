// IMPORTS
import http from '@/api/http.js';

// SETUP BASE URL
const BASE = '/boards';

// FUNCTION: GET BOARDS
const getBoards = () => {
	return http.get(BASE);
};

// FUNCTION: GET BOARD
const getBoard = (id) => {
	return http.get(`${ BASE }/${ id }`);
};

// FUNCTION: CREATE BOARD
const createBoard = (name) => {
	return http.post(BASE, { name });
};

// FUNCTION: UPDATE BOARD
const updateBoard = (id, name) => {
	return http.patch(`${ BASE }/${ id }`, { name });
};

// FUNCTION: DELETE BOARD
const deleteBoard = (id) => {
	return http.delete(`${ BASE }/${ id }`);
};

// EXPORTS
export {
	getBoard,
	getBoards,
	createBoard,
	updateBoard,
	deleteBoard
};
