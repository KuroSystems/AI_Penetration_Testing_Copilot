import type { ChatMessage } from '@ai-pentest/contracts';
import { User, ShieldAlert } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MessageListProps {
  messages: ChatMessage[];
  streamingMessage: string | null;
}

export function MessageList({ messages, streamingMessage }: MessageListProps) {
  return (
    <div className="flex flex-col gap-6 mb-4">
      {messages.map((msg, idx) => (
        <MessageItem key={idx} message={msg} />
      ))}
      {streamingMessage && (
        <MessageItem 
            message={{ 
                role: 'assistant', 
                content: streamingMessage, 
                timestamp: new Date() 
            }} 
            isStreaming 
        />
      )}
    </div>
  );
}

function MessageItem({ message, isStreaming }: { message: ChatMessage, isStreaming?: boolean }) {
  const isAssistant = message.role === 'assistant' || message.role === 'system';

  return (
    <div className={cn(
      "flex gap-4 p-4 rounded-xl transition-colors",
      isAssistant ? "bg-zinc-800/30 border border-zinc-800/50" : "bg-transparent"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border",
        isAssistant 
            ? "bg-blue-600/10 text-blue-500 border-blue-500/20" 
            : "bg-zinc-700 text-zinc-300 border-zinc-600"
      )}>
        {isAssistant ? <ShieldAlert size={16} /> : <User size={16} />}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
            {isAssistant ? 'Copilot' : 'Pentester'}
        </div>
        <div className="text-sm leading-relaxed prose prose-invert max-w-none whitespace-pre-wrap text-zinc-200">
          {message.content}
          {isStreaming && <span className="inline-block w-1.5 h-4 ml-1 bg-blue-500 animate-pulse align-middle" />}
        </div>
      </div>
    </div>
  );
}
