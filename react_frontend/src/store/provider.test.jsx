import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider, useSelector } from "react-redux";
import { store } from "./index";

function Probe() {
  const status = useSelector((s) => s.platformMetrics.status);
  return <p>metrics: {status}</p>;
}

describe("app store with <Provider>", () => {
  it("lets a component read a slice from the real store", () => {
    render(
      <Provider store={store}>
        <Probe />
      </Provider>,
    );
    expect(screen.getByText("metrics: idle")).toBeInTheDocument();
  });
});
