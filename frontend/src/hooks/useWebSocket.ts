import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  tool?: string;
  success?: boolean;
}

export function useWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { token, user } = useAuthStore();
  const reconnectTimer = useRef<number>();

  const connect = useCallback(() => {
    if (!token || !user || socket?.readyState === WebSocket.CONNECTING) return;

    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';
      const newSocket = new WebSocket(wsUrl);

      newSocket.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };

      newSocket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds
        if (event.code !== 1000) { // Not a normal closure
          reconnectTimer.current = window.setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different message types
          if (data.error) {
            const errorMessage: Message = {
              id: Date.now().toString(),
              content: `Error: ${data.error}`,
              sender: 'assistant',
              timestamp: new Date(),
              success: false
            };
            setMessages(prev => [...prev, errorMessage]);
          } else if (data.success !== undefined) {
            const resultMessage: Message = {
              id: Date.now().toString(),
              content: data.success 
                ? (typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2))
                : `Error: ${data.error}`,
              sender: 'assistant',
              timestamp: new Date(),
              tool: data.tool,
              success: data.success
            };
            setMessages(prev => [...prev, resultMessage]);
          } else {
            // Generic message
            const message: Message = {
              id: Date.now().toString(),
              content: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
              sender: 'assistant',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, message]);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      setSocket(newSocket);
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }, [token, user, socket?.readyState]);

  useEffect(() => {
    if (token && user) {
      connect();
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
      }
      setIsConnected(false);
    }

    return () => {
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
      }
      if (socket) {
        socket.close();
      }
    };
  }, [token, user, connect]);

  const sendMessage = useCallback(async (data: any) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    // Add user message to list
    const userMessage: Message = {
      id: Date.now().toString(),
      content: data.content || data.tool || 'Command sent',
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Send to server
    socket.send(JSON.stringify(data));
  }, [socket]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    sendMessage,
    isConnected,
    clearMessages
  };
}