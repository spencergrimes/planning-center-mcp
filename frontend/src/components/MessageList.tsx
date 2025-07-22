import { useEffect, useRef } from 'react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  tool?: string;
  success?: boolean;
}

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatContent = (content: string) => {
    // Simple formatting for JSON responses
    try {
      const parsed = JSON.parse(content);
      return (
        <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-3 rounded-lg overflow-x-auto">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      // Not JSON, return as plain text
      return <div className="whitespace-pre-wrap">{content}</div>;
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-gray-500">
          <div className="mb-4">
            <svg 
              className="mx-auto h-12 w-12 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Welcome to Planning Center Assistant
          </h3>
          <p className="text-gray-600">
            Start a conversation by asking about your teams, services, or songs.
          </p>
          <div className="mt-4 space-y-2 text-sm text-gray-500">
            <p>Try asking:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>"Show me upcoming services"</li>
              <li>"Find songs with the theme 'Christmas'"</li>
              <li>"Who's on the worship team?"</li>
              <li>"Search for John Smith"</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-3xl rounded-lg px-4 py-3 ${
              message.sender === 'user'
                ? 'bg-blue-600 text-white'
                : `${
                    message.success === false 
                      ? 'bg-red-50 border border-red-200 text-red-800' 
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`
            }`}
          >
            <div className="flex items-start justify-between mb-1">
              <span className={`text-xs font-medium ${
                message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.sender === 'user' ? 'You' : 'Assistant'}
                {message.tool && ` (${message.tool})`}
              </span>
              <span className={`text-xs ${
                message.sender === 'user' ? 'text-blue-100' : 'text-gray-400'
              }`}>
                {formatTime(message.timestamp)}
              </span>
            </div>
            <div className={`${
              message.sender === 'user' ? 'text-white' : 'text-gray-900'
            }`}>
              {message.sender === 'assistant' && message.content.startsWith('{') 
                ? formatContent(message.content)
                : <div className="whitespace-pre-wrap">{message.content}</div>
              }
            </div>
            {message.success === false && (
              <div className="mt-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                ⚠️ Command failed
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}