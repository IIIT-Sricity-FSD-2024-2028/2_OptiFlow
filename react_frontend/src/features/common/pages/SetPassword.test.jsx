import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import SetPassword from "./SetPassword";

describe("SetPassword page", () => {
  it("renders with a token in the link", () => {
    const store = configureStore({ reducer: (s = {}) => s });
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/set-password?token=abc"]}>
          <SetPassword />
        </MemoryRouter>
      </Provider>,
    );
    expect(document.querySelectorAll('input[type="password"]')).toHaveLength(2);
  });
});
