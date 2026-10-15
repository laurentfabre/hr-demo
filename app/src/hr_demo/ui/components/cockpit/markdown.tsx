import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }: { children: string }) {
  return <div className="answer-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml
    components={{
      a: ({ children, href }) => href && /^(https?:\/\/|\/[^/])/.test(href)
        ? <a href={href} target="_blank" rel="noreferrer noopener">{children}</a> : <span>{children}</span>,
      img: ({ alt }) => <span>{alt}</span>,
      table: ({ children }) => <div className="table-scroll"><table>{children}</table></div>,
    }}>{children}</ReactMarkdown></div>;
}
