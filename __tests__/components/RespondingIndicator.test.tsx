import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import RespondingIndicator from "@/components/RespondingIndicator";

describe("RespondingIndicator", () => {
  it("「回答中」と表示する", () => {
    render(<RespondingIndicator />);

    expect(screen.getByText("回答中")).toBeDefined();
  });

  it("読み上げソフトに伝わるよう、status（状態のお知らせ）として表示する", () => {
    render(<RespondingIndicator />);

    expect(screen.getByRole("status").textContent).toBe("回答中");
  });

  it("AIの吹き出しと同じ左側に表示する", () => {
    const { container } = render(<RespondingIndicator />);

    expect(container.firstElementChild?.className).toContain("justify-start");
  });
});
