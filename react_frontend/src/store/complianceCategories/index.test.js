import { describe, it, expect } from "vitest";
import reducer, {
  fetchComplianceCategories,
  createComplianceCategory,
  updateComplianceCategory,
  deleteComplianceCategory,
  selectAllComplianceCategories,
  selectComplianceCategoriesStatus,
  selectComplianceCategoriesError,
  selectIsComplianceCategoriesLoading,
} from "./index";

describe("complianceCategories slice", () => {
  const initialState = {
    items: [],
    status: "idle",
    error: null,
    loadedAt: null,
    mutations: {},
  };

  it("returns initial state by default", () => {
    expect(reducer(undefined, { type: "UNKNOWN" })).toEqual(initialState);
  });

  describe("fetchComplianceCategories", () => {
    it("sets status to loading on pending", () => {
      const state = reducer(initialState, fetchComplianceCategories.pending());
      expect(state.status).toBe("loading");
      expect(state.error).toBeNull();
    });

    it("populates items and sets status to succeeded on fulfilled", () => {
      const mockItems = [
        { id: "cat-1", name: "Security" },
        { id: "cat-2", name: "Privacy" },
      ];
      const state = reducer(
        initialState,
        fetchComplianceCategories.fulfilled(mockItems)
      );
      expect(state.status).toBe("succeeded");
      expect(state.items).toEqual(mockItems);
      expect(typeof state.loadedAt).toBe("number");
    });

    it("sets status to failed and sets error on rejected", () => {
      const mockError = { message: "Failed to fetch", status: 500 };
      const state = reducer(
        initialState,
        fetchComplianceCategories.rejected(null, "", false, mockError)
      );
      expect(state.status).toBe("failed");
      expect(state.error).toEqual(mockError);
    });
  });

  describe("createComplianceCategory", () => {
    it("prepends new category to items on fulfilled", () => {
      const existing = [{ id: "cat-1", name: "Existing" }];
      const previousState = { ...initialState, items: existing };
      const newCategory = { id: "cat-2", name: "New Category" };

      const state = reducer(
        previousState,
        createComplianceCategory.fulfilled(newCategory)
      );
      expect(state.items).toHaveLength(2);
      expect(state.items[0]).toEqual(newCategory);
      expect(state.items[1]).toEqual(existing[0]);
    });
  });

  describe("updateComplianceCategory", () => {
    it("updates target category in items on fulfilled", () => {
      const previousState = {
        ...initialState,
        items: [
          { id: "cat-1", name: "Original Name" },
          { id: "cat-2", name: "Unchanged" },
        ],
      };
      const updatedCategory = { id: "cat-1", name: "Updated Name" };

      const state = reducer(
        previousState,
        updateComplianceCategory.fulfilled(updatedCategory)
      );
      expect(state.items[0].name).toBe("Updated Name");
      expect(state.items[1].name).toBe("Unchanged");
    });
  });

  describe("deleteComplianceCategory", () => {
    it("filters out deleted category on fulfilled", () => {
      const previousState = {
        ...initialState,
        items: [
          { id: "cat-1", name: "Cat 1" },
          { id: "cat-2", name: "Cat 2" },
        ],
      };

      const state = reducer(
        previousState,
        deleteComplianceCategory.fulfilled({ id: "cat-1" })
      );
      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe("cat-2");
    });
  });

  describe("selectors", () => {
    const mockRootState = {
      complianceCategories: {
        items: [{ id: "c1", name: "Operations" }],
        status: "loading",
        error: { message: "Test error" },
        loadedAt: 123456,
      },
    };

    it("selectAllComplianceCategories selects items", () => {
      expect(selectAllComplianceCategories(mockRootState)).toEqual([
        { id: "c1", name: "Operations" },
      ]);
    });

    it("selectComplianceCategoriesStatus selects status", () => {
      expect(selectComplianceCategoriesStatus(mockRootState)).toBe("loading");
    });

    it("selectComplianceCategoriesError selects error", () => {
      expect(selectComplianceCategoriesError(mockRootState)).toEqual({
        message: "Test error",
      });
    });

    it("selectIsComplianceCategoriesLoading returns true when status is loading", () => {
      expect(selectIsComplianceCategoriesLoading(mockRootState)).toBe(true);
    });
  });
});
