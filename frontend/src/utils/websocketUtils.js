export const setupWebSocketWithHeartbeat = (url, onOpen, onMessage, onError, onClose) => {
  let socket = null;
  let reconnectTimer = null;
  let heartbeatTimer = null;
  let isConnecting = false;
  let messageQueue = [];
  
  // internal connection status tracking
  let connectionState = {
    isConnected: false,
    lastAttempt: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    backoffMs: 1000,
  };

  const connect = () => {
    if (isConnecting || (socket && socket.readyState === WebSocket.OPEN)) return;
    
    isConnecting = true;
    connectionState.lastAttempt = Date.now();
    
    if (socket) {
      try {
        socket.close();
      } catch (e) {
        console.log("Error closing previous socket:", e);
      }
    }
    
    try {
      socket = new WebSocket(url);

      socket.onopen = () => {
        console.log("WebSocket connected");
        isConnecting = false;
        connectionState.isConnected = true;
        connectionState.reconnectAttempts = 0;
        connectionState.backoffMs = 1000;
        
        // process any queued messages
        while (messageQueue.length > 0) {
          const msg = messageQueue.shift();
          sendMessage(msg);
        }
        
        // start heartbeat
        startHeartbeat();
        
        if (onOpen) onOpen();
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // handle heartbeat responses
        if (data.type === 'heartbeat') {
          // respond to heartbeat with pong
          socket.send(JSON.stringify({
            type: 'pong',
            timestamp: data.timestamp
          }));
          return;
        }
        
        if (onMessage) onMessage(event);
      };

      socket.onerror = (event) => {
        connectionState.isConnected = false;
        if (onError) onError(event);
      };

      socket.onclose = (event) => {
        connectionState.isConnected = false;
        isConnecting = false;
        
        // stop heartbeat
        stopHeartbeat();
        
        if (onClose) onClose(event);
        
        // don't reconnect if closed deliberately
        if (!event.wasClean && connectionState.reconnectAttempts < connectionState.maxReconnectAttempts) {
          const backoff = connectionState.backoffMs * Math.pow(1.5, connectionState.reconnectAttempts);
          console.log(`Scheduling reconnect in ${backoff}ms`);
          
          connectionState.reconnectAttempts++;
          reconnectTimer = setTimeout(connect, backoff);
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      isConnecting = false;
      
      // schedule reconnect
      reconnectTimer = setTimeout(connect, connectionState.backoffMs);
    }
  };

  const startHeartbeat = () => {
    // clear any existing heartbeat
    stopHeartbeat();
    
    // send heartbeat every 30 seconds
    heartbeatTimer = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
      }
    }, 30000);
  };

  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  // function to send a message or queue it if connection not ready
  const sendMessage = (message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(message);
      return true;
    } else {
      // queue message for when connection is established
      messageQueue.push(message);
      
      // try to connect if not already connecting
      if (!isConnecting) {
        connect();
      }
      return false;
    }
  };

  // start the connection
  connect();

  // return functions for controlling the socket
  return {
    socket,
    sendMessage,
    isReady: () => socket && socket.readyState === WebSocket.OPEN,
    getConnectionState: () => ({
      ...connectionState,
      readyState: socket ? socket.readyState : -1,
    }),
    reconnect: () => {
      connect();
    },
    cleanup: () => {
      // clear timers
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      stopHeartbeat();
      
      // close socket
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
      }
    }
  };
};
