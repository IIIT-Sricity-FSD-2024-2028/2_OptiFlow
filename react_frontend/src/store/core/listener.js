import { createListenerMiddleware, isRejected } from "@reduxjs/toolkit";
import { API_EVENT } from "../../services/api/client";

// The store never calls UI code. For a 403 it announces the failure on the same window event
// the client already uses for 402 ("plan-blocked"); app/ApiEventsBridge listens and shows the toast.
export const FORBIDDEN_EVENT_TYPE = "forbidden";

// 403s that pages already show in their own way, so the shared toast must stay out of it.
// A COMPLIANCE_BLOCK is a 403 too, and the task and process screens render its violation list.
export const HANDLED_403_CODES = ["COMPLIANCE_BLOCK"];

export const isSharedForbidden = (action) =>
  isRejected(action) &&
  action.payload?.status === 403 &&
  !HANDLED_403_CODES.includes(action.payload.code);

function announceForbidden(message) {
  try {
    window.dispatchEvent(
      new CustomEvent(API_EVENT, { detail: { type: FORBIDDEN_EVENT_TYPE, message } }),
    );
  } catch {
    /* non-browser environment */
  }
}

// A new middleware per store (makeStore calls this), so tests never share listeners.
export function createForbiddenListener() {
  const listener = createListenerMiddleware();
  listener.startListening({
    predicate: isSharedForbidden,
    effect: (action) => announceForbidden(action.payload.message),
  });
  return listener;
}
