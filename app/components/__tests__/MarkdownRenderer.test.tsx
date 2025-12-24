import { render, screen } from "@testing-library/react";
import MarkdownRenderer from "../MarkdownRenderer";

describe("MarkdownRenderer", () => {
  it("should render plain text", () => {
    render(<MarkdownRenderer content="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("should render markdown headings", () => {
    render(
      <MarkdownRenderer content="# Heading 1\n## Heading 2\n### Heading 3" />
    );
    expect(
      screen.getByText(/# Heading 1[\s\S]*## Heading 2[\s\S]*### Heading 3/)
    ).toBeInTheDocument();
  });

  it("should render paragraphs", () => {
    render(<MarkdownRenderer content="First paragraph\n\nSecond paragraph" />);
    expect(
      screen.getByText(/First paragraph[\s\S]*Second paragraph/)
    ).toBeInTheDocument();
  });

  it("should render lists", () => {
    render(<MarkdownRenderer content="- Item 1\n- Item 2\n- Item 3" />);
    expect(
      screen.getByText(/- Item 1[\s\S]*- Item 2[\s\S]*- Item 3/)
    ).toBeInTheDocument();
  });

  it("should render ordered lists", () => {
    render(<MarkdownRenderer content="1. First\n2. Second\n3. Third" />);
    expect(
      screen.getByText(/1\. First[\s\S]*2\. Second[\s\S]*3\. Third/)
    ).toBeInTheDocument();
  });

  it("should render inline code", () => {
    render(<MarkdownRenderer content="This is `inline code` text" />);
    expect(screen.getByText(/This is.*inline code.*text/)).toBeInTheDocument();
  });

  it("should render code blocks", () => {
    render(<MarkdownRenderer content="```\nconst x = 1;\n```" />);
    expect(
      screen.getByText(/```[\s\S]*const x = 1;[\s\S]*```/)
    ).toBeInTheDocument();
  });

  it("should render blockquotes", () => {
    render(<MarkdownRenderer content="> This is a quote" />);
    expect(screen.getByText(/> This is a quote/)).toBeInTheDocument();
  });

  it("should handle empty content", () => {
    const { container } = render(<MarkdownRenderer content="" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("should handle newlines with remark-breaks", () => {
    render(<MarkdownRenderer content="Line 1\nLine 2\nLine 3" />);
    expect(
      screen.getByText(/Line 1[\s\S]*Line 2[\s\S]*Line 3/)
    ).toBeInTheDocument();
  });

  it("should render complex markdown", () => {
    const content = `# Title

This is a paragraph with **bold** and *italic* text.

- List item 1
- List item 2

\`\`\`javascript
const code = "example";
\`\`\`
`;

    render(<MarkdownRenderer content={content} />);
    expect(screen.getByText(/Title/)).toBeInTheDocument();
    expect(screen.getByText(/This is a paragraph/i)).toBeInTheDocument();
    expect(screen.getByText(/List item 1/)).toBeInTheDocument();
    expect(screen.getByText(/List item 2/)).toBeInTheDocument();
  });
});
