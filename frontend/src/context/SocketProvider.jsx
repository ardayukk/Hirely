import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children, userId }) => {
  const [sockets, setSockets] = useState({});
  const [messages, setMessages] = useState({});
  const [connectionStatus, setConnectionStatus] = useState({});
  const socketRefs = useRef({});
  const reconnectTimeouts = useRef({});

  // Connect to a specific order's WebSocket
  const connect = useCallback((orderId) => {
    if (!userId || !orderId) {
      console.error('userId and orderId are required to connect');
      return;
    }

    // Check if already connected
    if (socketRefs.current[orderId]?.readyState === WebSocket.OPEN) {
      console.log(`Already connected to order ${orderId}`);
      return;
    }

    // Clear any existing reconnection timeout
    if (reconnectTimeouts.current[orderId]) {
      clearTimeout(reconnectTimeouts.current[orderId]);
    }

    const wsUrl = `ws://127.0.0.1:8000/api/messages/ws/${orderId}?user_id=${userId}`;
    
    try {
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log(`WebSocket connected to order ${orderId}`);
        setConnectionStatus(prev => ({ ...prev, [orderId]: 'connected' }));
        socketRefs.current[orderId] = socket;
        setSockets(prev => ({ ...prev, [orderId]: socket }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'new_message') {
            setMessages(prev => ({
              ...prev,
              [orderId]: [...(prev[orderId] || []), data.message]
            }));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socket.onerror = (error) => {
        console.error(`WebSocket error for order ${orderId}:`, error);
        setConnectionStatus(prev => ({ ...prev, [orderId]: 'error' }));
      };

      socket.onclose = (event) => {
        console.log(`WebSocket closed for order ${orderId}`, event.code, event.reason);
        setConnectionStatus(prev => ({ ...prev, [orderId]: 'disconnected' }));
        
        // Clean up
        delete socketRefs.current[orderId];
        setSockets(prev => {
          const newSockets = { ...prev };
          delete newSockets[orderId];
          return newSockets;
        });

        // Auto-reconnect if not a normal closure
        if (event.code !== 1000 && event.code !== 1008) {
          reconnectTimeouts.current[orderId] = setTimeout(() => {
            console.log(`Attempting to reconnect to order ${orderId}...`);
            connect(orderId);
          }, 3000);
        }
      };

      socketRefs.current[orderId] = socket;
      setConnectionStatus(prev => ({ ...prev, [orderId]: 'connecting' }));

    } catch (error) {
      console.error(`Failed to create WebSocket for order ${orderId}:`, error);
      setConnectionStatus(prev => ({ ...prev, [orderId]: 'error' }));
    }
  }, [userId]);

  // Disconnect from a specific order
  const disconnect = useCallback((orderId) => {
    const socket = socketRefs.current[orderId];
    if (socket) {
      // Clear reconnection timeout
      if (reconnectTimeouts.current[orderId]) {
        clearTimeout(reconnectTimeouts.current[orderId]);
        delete reconnectTimeouts.current[orderId];
      }

      socket.close(1000, 'Client disconnect');
      delete socketRefs.current[orderId];
      
      setSockets(prev => {
        const newSockets = { ...prev };
        delete newSockets[orderId];
        return newSockets;
      });
      
      setConnectionStatus(prev => ({ ...prev, [orderId]: 'disconnected' }));
    }
  }, []);

  // Send a message to a specific order
  const sendMessage = useCallback((orderId, messageText, replyToId = null) => {
    const socket = socketRefs.current[orderId];
    
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error(`WebSocket not connected for order ${orderId}`);
      return false;
    }

    try {
      socket.send(JSON.stringify({
        type: 'message',
        message_text: messageText,
        reply_to_id: replyToId
      }));
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, []);

  // Clear messages for an order
  const clearMessages = useCallback((orderId) => {
    setMessages(prev => {
      const newMessages = { ...prev };
      delete newMessages[orderId];
      return newMessages;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Close all connections on unmount
      Object.keys(socketRefs.current).forEach(orderId => {
        const socket = socketRefs.current[orderId];
        if (socket) {
          socket.close(1000, 'Component unmount');
        }
      });

      // Clear all reconnection timeouts
      Object.values(reconnectTimeouts.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  const value = {
    connect,
    disconnect,
    sendMessage,
    clearMessages,
    sockets,
    messages,
    connectionStatus,
    isConnected: (orderId) => socketRefs.current[orderId]?.readyState === WebSocket.OPEN
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
