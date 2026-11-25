import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubscriptionPeriodModal } from "./SubscriptionPeriodModal";

const day = (offset) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().split("T")[0];
};

function setup() {
  const onConfirm = vi.fn().mockResolvedValue();
  const subscription = {
    currentPeriodStart: new Date(Date.now() - 20 * 864e5).toISOString(),
    currentPeriodEnd: new Date(Date.now() + 10 * 864e5).toISOString(),
  };
  render(<SubscriptionPeriodModal isOpen subscription={subscription} onClose={vi.fn()} onConfirm={onConfirm} />);
  return { onConfirm, user: userEvent.setup() };
}

const submitWith = async (user, date, reason = "Goodwill extension") => {
  const input = document.querySelector('input[type="date"]');
  fireEvent.change(input, { target: { value: date } });
  await user.type(screen.getByPlaceholderText(/goodwill/i), reason);
  await user.click(screen.getByRole("button", { name: /save period/i }));
};

describe("SubscriptionPeriodModal date validation", () => {
  it("limits the picker to today..5 years", () => {
    setup();
    const input = document.querySelector('input[type="date"]');
    expect(input.min).toBe(day(0));
    expect(Number(input.max.slice(0, 4))).toBe(new Date().getUTCFullYear() + 5);
  });

  it("rejects a past date", async () => {
    const { onConfirm, user } = setup();
    await submitWith(user, day(-3));
    expect(await screen.findByText(/today or later/i)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("rejects the unchanged date", async () => {
    const { onConfirm, user } = setup();
    await submitWith(user, day(10));
    expect(await screen.findByText(/already the current period end/i)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("rejects a date more than 5 years out", async () => {
    const { onConfirm, user } = setup();
    await submitWith(user, `${new Date().getUTCFullYear() + 6}-01-01`);
    expect(await screen.findByText(/more than 5 years/i)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("sends a valid future date at the end of that day", async () => {
    const { onConfirm, user } = setup();
    await submitWith(user, day(40));
    expect(onConfirm).toHaveBeenCalledWith({
      currentPeriodEnd: `${day(40)}T23:59:59.999Z`,
      reason: "Goodwill extension",
    });
  });
});
