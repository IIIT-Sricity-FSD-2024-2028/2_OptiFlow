import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { createEvidence, updateEvidence, uploadEvidenceFile } from '../../../../../store/evidence';

// Keep the created ID for this open form so a retry after a failed upload
// or subtask submission updates the same evidence record.
export function useSaveEvidence(isOpen, existingId, taskId) {
  const dispatch = useDispatch();
  const savedId = useRef(null);
  useEffect(() => {
    savedId.current = null;
  }, [isOpen, existingId, taskId]);

  return async (data, file) => {
    const id = existingId || savedId.current;
    const record = await dispatch(id ? updateEvidence({ id, data }) : createEvidence(data)).unwrap();
    const recordId = record?.id || record?.data?.id || id;
    savedId.current = recordId;
    if (file && recordId) await dispatch(uploadEvidenceFile({ id: recordId, file })).unwrap();
    return record;
  };
}
