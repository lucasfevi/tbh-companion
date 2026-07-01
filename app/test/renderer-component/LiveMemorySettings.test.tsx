import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { LiveMemoryPrefs } from "../../shared/types";
import { LiveMemorySettings } from "../../src/renderer/components/LiveMemorySettings";

function setup(prefs: LiveMemoryPrefs) {
  const onChange = vi.fn();
  render(<LiveMemorySettings prefs={prefs} onChange={onChange} />);
  return { onChange, user: userEvent.setup() };
}

describe("LiveMemorySettings", () => {
  it("gates the first enable behind the consent dialog and starts reading only on accept", async () => {
    const { onChange, user } = setup({ enabled: false, consentAccepted: false });

    await user.click(screen.getByRole("checkbox", { name: /enable live memory reader/i }));

    // Consent dialog is shown; nothing enabled yet.
    expect(screen.getByText(/read the game.*memory/i)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /accept/i }));
    expect(onChange).toHaveBeenCalledWith({ enabled: true, consentAccepted: true });
  });

  it("does not enable when the consent dialog is cancelled", async () => {
    const { onChange, user } = setup({ enabled: false, consentAccepted: false });

    await user.click(screen.getByRole("checkbox", { name: /enable live memory reader/i }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onChange).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /accept/i })).not.toBeInTheDocument(),
    );
  });

  it("enables without re-prompting once consent was previously accepted", async () => {
    const { onChange, user } = setup({ enabled: false, consentAccepted: true });

    await user.click(screen.getByRole("checkbox", { name: /enable live memory reader/i }));
    expect(screen.queryByRole("button", { name: /accept & enable/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /enable & reset session/i }));

    expect(onChange).toHaveBeenCalledWith({ enabled: true, consentAccepted: true });
  });

  it("disables the reader after session-reset confirmation", async () => {
    const { onChange, user } = setup({ enabled: true, consentAccepted: true });

    await user.click(screen.getByRole("checkbox", { name: /enable live memory reader/i }));
    await user.click(screen.getByRole("button", { name: /disable & reset session/i }));

    expect(onChange).toHaveBeenCalledWith({ enabled: false, consentAccepted: true });
  });
});
