import { apiClient, ApiError, buildUrl } from './client';
import { getToken } from '../auth/session';

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

// Authenticated CSV export of the evidence audit log. Resolves to a Blob: the caller saves it,
// it never goes into the store. Uses the same base URL and session token as apiClient.
export const exportCsv = async ({ signal } = {}) => {
  const token = getToken();
  let response;
  try {
    response = await fetch(buildUrl(`${BASE_PATH}/export/csv`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw new ApiError('Request cancelled', { code: 'ABORTED' });
    throw new ApiError('Cannot reach the server. Check your connection and try again.', { code: 'NETWORK_ERROR' });
  }
  if (!response.ok) {
    throw new ApiError('Failed to export evidence data', { status: response.status });
  }
  return response.blob();
};
