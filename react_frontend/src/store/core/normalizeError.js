import { ApiError } from "../../services/api/client";

//Turns any error a thunk can catch into a plain object in text format.
//Redux state must hold plain data, and an ApiError is an instance of error class which must normalised.

export function normalizeError(err) {
  if (err instanceof ApiError) {
    //data is dropped, as it is huge, and these details are sufficient.
    return {
      message: err.message,
      status: err.status,
      code: err.code,
      details: err.details ?? null,
    };
  }

  //if not an ApiError - a bug error
  const message =
    (err && typeof err.message === "string" && err.message) ||
    (typeof err === "string" && err) ||
    "Something went wrong. Please try again.";
  return { message, status: 0, code: "UNKNOWN_ERROR", details: null };
}
