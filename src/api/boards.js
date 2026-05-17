// IMPORTS
import axios from 'axios';

// SETUP BASE URL
const BASE = '/api/boards';

// FUNCTION: GET BOARDS
const getBoards = () => {
	return axios.get(BASE);
};

// FUNCTION: GET BOARD
const getBoard = (id) => {
	return axios.get(`${ BASE }/${ id }`);
};

// FUNCTION: CREATE BOARD
const createBoard = (name) => {
	return axios.post(BASE, { name });
};

// FUNCTION: UPDATE BOARD
const updateBoard = (id, name) => {
	return axios.patch(`${ BASE }/${ id }`, { name });
};

// FUNCTION: DELETE BOARD
const deleteBoard = (id) => {
	return axios.delete(`${ BASE }/${ id }`);
};

// EXPORTS
export {
	getBoard,
	getBoards,
	createBoard,
	updateBoard,
	deleteBoard
};
