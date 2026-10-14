import { apiClient } from './client';

// Centralized API calls for compliance evidence

const BASE_PATH = '/api/evidence';

export const list = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;
  return apiClient(url);
};

export const get = (id) => {
  return apiClient(`${BASE_PATH}/${id}`);
};

export const create = (data) => {
  return apiClient(BASE_PATH, {
    method: 'POST',
    body: data,
  });
};

export const update = (id, data) => {
  return apiClient(`${BASE_PATH}/${id}`, {
    method: 'PATCH',
    body: data,
  });
};

export const remove = (id) => {
  return apiClient(`${BASE_PATH}/${id}`, {
    method: 'DELETE',
  });
};

export const uploadFile = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient(`${BASE_PATH}/${id}/upload`, {
    method: 'POST',
    body: formData,
  });
};

// Aliases for compatibility
export const getEvidenceList = list;
export const getEvidence = get;
export const createEvidence = create;
export const updateEvidence = update;
export const removeEvidence = remove;
export const uploadEvidenceFile = uploadFile;
