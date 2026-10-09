import { useState, useEffect, useCallback } from 'react';

// WHY: A custom hook that abstracts away the repetitive boilerplate of fetching data.
// Instead of writing useState and useEffect in every component, you just call:
// const { data, loading, error, reload } = useApi(() => getEvidenceList());

export const useApi = (apiFunction, immediate = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  // useCallback ensures this function isn't recreated on every render, 
  // which prevents infinite loops if someone uses `reload` in a useEffect dependency array.
  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || 'Something went wrong');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { data, loading, error, reload: execute };
};
