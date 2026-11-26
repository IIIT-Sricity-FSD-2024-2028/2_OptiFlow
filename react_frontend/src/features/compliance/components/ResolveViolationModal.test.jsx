import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { makeStore } from "../../../store";
import { ResolveViolationModal } from "./ResolveViolationModal";
import * as clientMod from "../../../services/api/client";

const sampleViolation = {
  id: "v-1",
  entityType: "Project",
  entityName: "Audit Test Project",
  status: "Open",
  rule: { name: "Mandatory Evidence Policy" },
  teamLead: { id: "tl-1", fullName: "Charlie Davis", email: "tl@acme.com" },
  entityOwner: { id: "tl-1", fullName: "Charlie Davis", email: "tl@acme.com" },
  notificationTargets: [
    { id: "tl-1", fullName: "Charlie Davis", email: "tl@acme.com", roleLabel: "Team Leader" },
    { id: "pm-1", fullName: "Bob Miller", email: "pm@acme.com", roleLabel: "Project Manager" },
  ],
};

describe("ResolveViolationModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("opens on the NOTIFY tab with Team Leader preselected and dispatches targetUserIds", async () => {
    const spy = vi.spyOn(clientMod, "apiClient").mockResolvedValue({
      recipients: [{ id: "tl-1", fullName: "Charlie Davis", email: "tl@acme.com" }],
    });

    render(
      <Provider store={makeStore()}>
        <ResolveViolationModal
          isOpen
          onClose={vi.fn()}
          violation={sampleViolation}
          initialTab="NOTIFY"
        />
      </Provider>,
    );

    const select = screen.getByRole("combobox");
    expect(select.value).toBe("tl-1");

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Please ensure OAuth evidence is uploaded." } });
    fireEvent.click(screen.getByRole("button", { name: "Send Urgent Notification" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith(
      "/api/compliance-violations/v-1/notify-owner",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          message: "Please ensure OAuth evidence is uploaded.",
          targetUserIds: ["tl-1"],
        }),
      }),
    );
    expect(await screen.findByText(/Compliance notice delivered to Charlie Davis/i)).toBeInTheDocument();
  });

  it("can send remarks as a notification when resolving a violation", async () => {
    const spy = vi.spyOn(clientMod, "apiClient").mockResolvedValue({
      ...sampleViolation,
      status: "Resolved",
    });

    render(
      <Provider store={makeStore()}>
        <ResolveViolationModal
          isOpen
          onClose={vi.fn()}
          violation={sampleViolation}
          initialTab="RESOLVE"
        />
      </Provider>,
    );

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Ask member to submit missing evidence" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Remediation & Resolve" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith(
      "/api/compliance-violations/v-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          status: "Resolved",
          waiverType: "VERIFIED_REMEDIATION",
          resolutionRemarks: "[Verified Remediation] Ask member to submit missing evidence",
          notifyTeamLead: true,
          notifyUserIds: ["tl-1"],
          notifyMessage: "Ask member to submit missing evidence",
        }),
      }),
    );
  });
});
