import { makeListSelectors } from "../core/keyedList";

const { selectEntry, selectMutation } = makeListSelectors("platformSubscriptions");

// Pages read the store only through these.
export const selectSubscriptionsEntry = selectEntry;
export const selectSubscriptionMutation = selectMutation;
