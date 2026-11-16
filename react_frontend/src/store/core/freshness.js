//How long a loaded list counts as fresh
//we are taking 60s
export const FRESHNESS_WINDOW_MS = 60*1000; //it is in ms 

export function isFresh(loadedAt,windowMs = FRESHNESS_WINDOW_MS,now = Date.now()){
    if (!loadedAt) return false;
    return now - loadedAt < windowMs;
}