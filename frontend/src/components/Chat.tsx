import { useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuthStore } from '../stores/authStore';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export function Chat() {
  const { user } = useAuthStore();
  const { messages, sendMessage, isConnected, clearMessages } = useWebSocket();
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    try {
      // Parse natural language to MCP command
      // For now, we'll send it as a simple message and let the server parse it
      await sendMessage({
        type: 'chat',
        content,
        // Could add more sophisticated parsing here
        tool: determineToolFromMessage(content),
        parameters: parseParametersFromMessage(content)
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Simple heuristic to determine which tool to use based on message content
  const determineToolFromMessage = (content: string): string | undefined => {
    const lower = content.toLowerCase();
    
    if (lower.includes('upcoming') && lower.includes('service')) {
      return 'getUpcomingServices';
    }
    if (lower.includes('team') && lower.includes('member')) {
      return 'getTeamMembers';
    }
    if (lower.includes('search') && (lower.includes('people') || lower.includes('person'))) {
      return 'searchPeople';
    }
    if (lower.includes('search') && lower.includes('song')) {
      return 'searchSongs';
    }
    if (lower.includes('song') && lower.includes('theme')) {
      return 'getSongsByTheme';
    }
    if (lower.includes('schedule') && lower.includes('team')) {
      return 'scheduleTeam';
    }
    
    return undefined;
  };

  // Extract parameters from natural language
  const parseParametersFromMessage = (content: string): any => {
    const lower = content.toLowerCase();
    const params: any = {};

    // Extract search query
    const searchMatch = content.match(/search (?:for )?"([^"]+)"/i) || 
                       content.match(/search (?:for )?(\w+(?:\s+\w+)*)/i);
    if (searchMatch) {
      params.query = searchMatch[1];
    }

    // Extract theme
    const themeMatch = content.match(/theme "([^"]+)"/i) || 
                      content.match(/theme (\w+)/i);
    if (themeMatch) {
      params.theme = themeMatch[1];
    }

    // Extract limit for services
    const limitMatch = content.match(/(\d+)\s+service/i);
    if (limitMatch) {
      params.limit = parseInt(limitMatch[1]);
    }

    return Object.keys(params).length > 0 ? params : undefined;
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Please log in to continue
          </h2>
          <p className="text-gray-600">
            You need to be authenticated to use the Planning Center Assistant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Planning Center Assistant
            </h1>
            <p className="text-sm text-gray-600">
              Connected to {user.organization.name}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Connection status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {/* Clear messages button */}
            <button
              onClick={clearMessages}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-md hover:bg-gray-100"
              disabled={messages.length === 0}
            >
              Clear Chat
            </button>
            
            {/* User info */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {user.role.toLowerCase()}
                </div>
              </div>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user.firstName[0]}{user.lastName[0]}
              </div>
            </div>
          </div>
        </div>
      </header>

      {!isConnected && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <div className="flex items-center gap-2 text-yellow-800">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">
              Connection lost. Attempting to reconnect...
            </span>
          </div>
        </div>
      )}

      <MessageList messages={messages} />
      
      <MessageInput 
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        placeholder="Ask about your teams, services, or songs..."
      />
    </div>
  );
}