import { render } from "@testing-library/react";
import SendIcon from "../SendIcon";

describe("SendIcon", () => {
  it("should render the send icon", () => {
    const { container } = render(<SendIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should apply default className", () => {
    const { container } = render(<SendIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("h-4", "w-4");
  });

  it("should apply custom className", () => {
    const { container } = render(<SendIcon className="h-6 w-6 custom-class" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("h-6", "w-6", "custom-class");
  });

  it("should have correct SVG attributes", () => {
    const { container } = render(<SendIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg).toHaveAttribute("fill", "none");
    expect(svg).toHaveAttribute("stroke", "currentColor");
  });
});
