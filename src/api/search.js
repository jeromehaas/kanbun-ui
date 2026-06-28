// IMPORTS
import http from '@/lib/http.js';

// FUNCTION: SEARCH TASKS
const searchTasks = (query, limit = 20) => {

  // SEND REQUEST
  return http.get('/tasks/search', {
    params: {
      q: query,
      limit,
    },
  });
};

// EXPORTS
export {
  searchTasks,
};
