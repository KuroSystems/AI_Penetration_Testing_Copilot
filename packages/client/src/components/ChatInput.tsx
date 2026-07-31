import { useState, type KeyboardEvent } from 'react';
import { SendHorizonal } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (content.trim() && !disabled) {
      onSend(content);
      setContent('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative group">
      <textarea
        rows={1}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask the Copilot or report a finding..."
        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none max-h-32 transition-all placeholder:text-zinc-500 text-zinc-200"
        disabled={disabled}
      />
      <button
        onClick={handleSubmit}
        disabled={!content.trim() || disabled}
        className="absolute right-2 bottom-2 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:bg-zinc-700 disabled:text-zinc-500 transition-colors shadow-lg shadow-blue-900/20"
      >
        <SendHorizonal size={18} />
      </button>
    </div>
  );
}
