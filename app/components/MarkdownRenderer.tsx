import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

interface MarkdownRendererProps {
  content: string;
}

/**
 * I Installed remark-breaks — Plugin that converts single newlines to <br> tags
 * - p: renders a paragraph
 * - h1: renders a heading 1
 * - h2: renders a heading 2
 * - h3: renders a heading 3
 * - ul: renders a list
 * - ol: renders a numbered list
 * - li: renders a list item
 * - code: renders a code block
 * - pre: renders a code block
 * - blockquote: renders a blockquote
 * - br: renders a line break
 */

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkBreaks]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        h1: ({ children }) => (
          <h1 className="text-xl font-bold mb-2 mt-4 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-bold mb-2 mt-4 first:mt-0">
            {children}
          </h3>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 space-y-1">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="ml-4">{children}</li>,
        code: ({ children }) => (
          <code className="bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-xs font-mono">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="bg-zinc-200 dark:bg-zinc-700 p-2 rounded mb-2 overflow-x-auto">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-zinc-400 dark:border-zinc-500 pl-4 italic mb-2">
            {children}
          </blockquote>
        ),
        br: () => <br />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
