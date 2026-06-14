// IMPORTS
import http from '@/lib/http.js';

// SETUP BASE URL
const BASE = '/boards';

// FUNCTION: GET BOARDS
const getBoards = () => {

	// SEND REQUEST
	return http.get(BASE);
};

// FUNCTION: GET BOARD
const getBoard = (id) => {

	// SEND REQUEST
	return http.get(`${ BASE }/${ id }`);
};

// FUNCTION: CREATE BOARD
const createBoard = (name) => {

	// SEND REQUEST
	return http.post(BASE, { name });
};

// FUNCTION: UPDATE BOARD
const updateBoard = (id, name) => {

	// SEND REQUEST
	return http.patch(`${ BASE }/${ id }`, { name });
};

// FUNCTION: DELETE BOARD
const deleteBoard = (id) => {

	// SEND REQUEST
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
