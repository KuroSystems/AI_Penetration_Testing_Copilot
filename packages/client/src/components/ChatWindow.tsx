import { useState, useEffect, useRef } from 'react';
import type { Session, ChatMessage } from '@ai-pentest/contracts';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

interface ChatWindowProps {
  session: Session;
  onUpdate: () => void;
}

export function ChatWindow({ session, onUpdate }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Local copy of chat history
    setMessages(session.state.chatHistory);
  }, [session]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  const handleSend = async (content: string) => {
    setIsLoading(true);
    // Optimistic update
    const userMsg: ChatMessage = { role: 'user', content, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    
    try {
      const response = await fetch('http://localhost:3000/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          prompt: content,
          stream: true
        })
      });

      if (!response.body) return;
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              if (json.chunk) {
                accumulatedContent += json.chunk;
                setStreamingMessage(accumulatedContent);
              }
              if (json.finalResult) {
                  // End of processing
                  onUpdate(); // Trigger refresh to get full updated session state
              }
            } catch (e) {
              // Partial JSON or other
            }
          }
        }
      }
      
      setStreamingMessage(null);
      // Wait for state refresh from onUpdate
    } catch (err) {
      console.error('Chat error', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-900 relative">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar scroll-smooth"
      >
        <div className="max-w-3xl mx-auto w-full">
            <MessageList messages={messages} streamingMessage={streamingMessage} />
            {isLoading && !streamingMessage && (
                <div className="flex gap-4 mb-6">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30 animate-pulse">
                        <span className="text-[10px] font-bold text-blue-400">AI</span>
                    </div>
                    <div className="flex-1 space-y-2 py-1">
                        <div className="h-2 bg-zinc-800 rounded w-1/4 animate-pulse"></div>
                        <div className="h-2 bg-zinc-800 rounded w-1/2 animate-pulse"></div>
                    </div>
                </div>
            )}
        </div>
      </div>
      
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky bottom-0">
        <div className="max-w-3xl mx-auto">
            <ChatInput onSend={handleSend} disabled={isLoading} />
            <div className="mt-2 text-center">
                <p className="text-[10px] text-zinc-500">
                    AI Pentest Copilot can make mistakes. Verify critical actions and stay within scope.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
