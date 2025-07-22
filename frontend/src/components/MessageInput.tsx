import React, { useState, useRef, type KeyboardEvent } from 'react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function MessageInput({ onSendMessage, isLoading, placeholder }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setMessage(textarea.value);
    
    // Auto-resize textarea
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  return (
    <div className="border-t border-gray-200 bg-white px-6 py-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-4">
        <div className="flex-1">
          <label htmlFor="message" className="sr-only">
            Message
          </label>
          <textarea
            ref={textareaRef}
            id="message"
            rows={1}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            className="block w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder={placeholder || "Type your message..."}
            disabled={isLoading}
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <kbd className="rounded bg-gray-100 px-2 py-1 text-xs font-medium">Enter</kbd>
              <span>to send</span>
              <kbd className="rounded bg-gray-100 px-2 py-1 text-xs font-medium">Shift + Enter</kbd>
              <span>for new line</span>
            </div>
          </div>
        </div>
        <button
          type="submit"
          disabled={!message.trim() || isLoading}
          className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <svg 
              className="h-4 w-4 animate-spin" 
              viewBox="0 0 24 24" 
              fill="none"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg 
              className="h-4 w-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
              />
            </svg>
          )}
        </button>
      </form>

      {/* Quick action buttons */}
      <div className="mt-3 flex flex-wrap gap-2">
        <QuickActionButton
          onClick={() => onSendMessage('Show me upcoming services')}
          disabled={isLoading}
        >
          📅 Upcoming Services
        </QuickActionButton>
        <QuickActionButton
          onClick={() => onSendMessage('Get all team members')}
          disabled={isLoading}
        >
          👥 Team Members
        </QuickActionButton>
        <QuickActionButton
          onClick={() => onSendMessage('Search songs with theme "worship"')}
          disabled={isLoading}
        >
          🎵 Worship Songs
        </QuickActionButton>
      </div>
    </div>
  );
}

interface QuickActionButtonProps {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}

function QuickActionButton({ onClick, disabled, children }: QuickActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}