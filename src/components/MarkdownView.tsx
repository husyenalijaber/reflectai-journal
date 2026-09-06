import React from 'react';
import Markdown from 'react-markdown';

interface MarkdownViewProps {
  content: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content }) => {
  return (
    <div className="markdown-content text-[#202124] text-xs sm:text-sm leading-relaxed space-y-3 font-sans">
      <Markdown>{content}</Markdown>
    </div>
  );
};
