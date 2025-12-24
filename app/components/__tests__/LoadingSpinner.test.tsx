import { render } from "@testing-library/react";
import LoadingSpinner from "../LoadingSpinner";

describe("LoadingSpinner", () => {
  it("should render the loading spinner", () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should apply default className with animate-spin", () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("h-4", "w-4", "animate-spin");
  });

  it("should apply custom className", () => {
    const { container } = render(
      <LoadingSpinner className="h-8 w-8 custom-class" />
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("h-8", "w-8", "custom-class", "animate-spin");
  });

  it("should have correct SVG structure", () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector("svg");
    const circle = svg?.querySelector("circle");
    const path = svg?.querySelector("path");

    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(circle).toBeInTheDocument();
    expect(path).toBeInTheDocument();
  });

  it("should have opacity classes for animation", () => {
    const { container } = render(<LoadingSpinner />);
    const circle = container.querySelector("circle");
    const path = container.querySelector("path");

    expect(circle).toHaveClass("opacity-25");
    expect(path).toHaveClass("opacity-75");
  });
});
