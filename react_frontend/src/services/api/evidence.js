import { apiClient } from './client';

// WHY: Separating API calls by resource keeps our code organized. 
// Any page needing evidence data just imports these functions without worrying about fetch logic.

const BASE_PATH = '/evidence';

export const getEvidenceList = (params = {}) => {
  // Convert params object to query string (e.g. ?violationId=123)
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;
  return apiClient(url);
};

export const getEvidence = (id) => {
  return apiClient(`${BASE_PATH}/${id}`);
};

export const createEvidence = (data) => {
  // NOTE: If data is a FormData object (for file uploads), 
  // you might need to adjust the client.js headers to let the browser set the boundary,
  // but for JSON payloads this works perfectly.
  return apiClient(BASE_PATH, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateEvidence = (id, data) => {
  return apiClient(`${BASE_PATH}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const removeEvidence = (id) => {
  return apiClient(`${BASE_PATH}/${id}`, {
    method: 'DELETE',
  });
};
