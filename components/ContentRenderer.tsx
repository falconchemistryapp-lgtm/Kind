import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatLatexAsUnicode } from '../utils';

interface ContentRendererProps {
    content?: string | null;
    inline?: boolean;
}

// Renders markdown content, attempting to be a drop-in replacement
// for simple string rendering by handling paragraphs gracefully.
export const ContentRenderer = ({ content, inline = false }: ContentRendererProps) => {
    if (!content) return null;

    // Apply the custom formatting function before rendering.
    const formattedContent = formatLatexAsUnicode(content);

    // The 'inline' prop is used to prevent nesting <p> tags, which is invalid HTML
    // and was causing formatting issues for subscripts/superscripts.
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
            }}
            // If inline, unwrap paragraphs to avoid nesting <p> inside <p> or other block elements
            unwrapDisallowed={inline}
            disallowedElements={inline ? ['p'] : []}
        >
            {formattedContent}
        </ReactMarkdown>
    );
};
