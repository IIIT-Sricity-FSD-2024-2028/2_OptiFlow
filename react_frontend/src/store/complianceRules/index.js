import { createSlice } from "@reduxjs/toolkit";
import { baseState } from "../core/createStubSlice";
import {
  fetchComplianceRules,
  fetchComplianceRuleById,
  createComplianceRule,
  updateComplianceRule,
  deleteComplianceRule,
  runComplianceEngine,
} from "./thunks";

const initialState = {
  ...baseState(),
  items: [],
  currentRule: null,
};

export const complianceRulesSlice = createSlice({
  name: "complianceRules",
  initialState,
  reducers: {
    clearComplianceRuleErrors: (state) => {
      state.error = null;
    },
    clearCurrentRule: (state) => {
      state.currentRule = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 1. Fetch All Rules Lifecycle
      .addCase(fetchComplianceRules.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchComplianceRules.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
        state.loadedAt = Date.now();
      })
      .addCase(fetchComplianceRules.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // 2. Fetch Single Rule Lifecycle (RuleDetail page)
      .addCase(fetchComplianceRuleById.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchComplianceRuleById.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.currentRule = action.payload;
      })
      .addCase(fetchComplianceRuleById.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // 3. Create Rule Lifecycle (prepend to list)
      .addCase(createComplianceRule.fulfilled, (state, action) => {
        state.items.unshift(action.payload); //adds items to the top of the array
      })

      // 4. Update Rule Lifecycle (syncs both the list AND currentRule)
      .addCase(updateComplianceRule.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id,
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentRule && state.currentRule.id === action.payload.id) {
          state.currentRule = action.payload;
        }
      })

      // 5. Delete Rule Lifecycle
      .addCase(deleteComplianceRule.fulfilled, (state, action) => {
        state.items = state.items.filter(
          (item) => item.id !== action.payload.id,
        );
        if (state.currentRule && state.currentRule.id === action.payload.id) {
          state.currentRule = null;
        }
      })

      // 6. Run Engine Lifecycle
      .addCase(runComplianceEngine.pending, (state) => {
        state.status = "loading";
      })
      .addCase(runComplianceEngine.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(runComplianceEngine.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { clearComplianceRuleErrors, clearCurrentRule } =
  complianceRulesSlice.actions;

// Re-export thunks and selectors so consumers can import directly from this folder
export * from "./thunks";
export * from "./selectors";

export default complianceRulesSlice.reducer;
