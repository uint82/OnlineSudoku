/**
 * Sets up a WebSocket connection with heartbeat, reconnection, and queue management
 * @param {string} url - WebSocket endpoint URL
 * @param {Function} onOpen - Callback when connection is established
 * @param {Function} onMessage - Callback when message is received
 * @param {Function} onError - Callback when error occurs
 * @param {Function} onClose - Callback when connection closes
 * @returns {Object} - Methods to control the WebSocket connection
 */
export const setupWebSocketWithHeartbeat = (
  url,
  onOpen,
  onMessage,
  onError,
  onClose
) => {
  let socket = null;
  let reconnectTimer = null;
  let heartbeatTimer = null;
  let connectionMonitorTimer = null;
  let connectionTimeout = null;
  let isConnecting = false;
  let isCleaningUp = false;
  let messageQueue = [];
  let lastMessageTime = 0;

  // connection state tracking
  let connectionState = {
    isConnected: false,
    lastAttempt: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    backoffMs: 1000,
  };

  /**
   * clear all active timers
   */
  const clearAllTimers = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (connectionMonitorTimer) {
      clearInterval(connectionMonitorTimer);
      connectionMonitorTimer = null;
    }
  };

  /**
   * handle safe socket closure
   * @param {WebSocket} socketToClose - the socket to close
   * @param {number} code - close code
   * @param {string} reason - close reason
   */
  const safeCloseSocket = (
    socketToClose,
    code = 1000,
    reason = "Normal closure"
  ) => {
    if (!socketToClose) return;

    // remove all listeners to prevent callbacks
    socketToClose.onopen = null;
    socketToClose.onmessage = null;
    socketToClose.onerror = null;
    socketToClose.onclose = null;

    // only close if not already closed/closing
    if (
      socketToClose.readyState !== WebSocket.CLOSED &&
      socketToClose.readyState !== WebSocket.CLOSING
    ) {
      try {
        socketToClose.close(code, reason);
      } catch (e) {
        console.log("Error closing socket:", e);
      }
    }
  };

  /**
   * start heartbeat mechanism
   */
  const startHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }

    // every 30 seconds
    heartbeatTimer = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("Sending heartbeat");
        sendRaw(
          JSON.stringify({
            type: "heartbeat", // 'heartbeat'
            timestamp: new Date().toISOString(),
          })
        );
      }
    }, 30000);
  };

  /**
   * start connection monitoring
   */
  const startConnectionMonitoring = () => {
    if (connectionMonitorTimer) {
      clearInterval(connectionMonitorTimer);
    }

    // check connection every 15 seconds
    connectionMonitorTimer = setInterval(() => {
      if (isCleaningUp || !socket || socket.readyState !== WebSocket.OPEN)
        return;

      const now = Date.now();
      // if no message received for 45 seconds
      if (now - lastMessageTime > 45000) {
        console.log("Connection appears stale, reconnecting");
        const tempSocket = socket;
        socket = null; // clear reference first
        safeCloseSocket(tempSocket);
        connect();
      }
    }, 15000);
  };

  /**
   * attempt to connect to WebSocket server
   */
  const connect = () => {
    if (isCleaningUp) {
      console.log("Cannot connect while cleaning up");
      return;
    }

    // throttle connection attempts
    const now = Date.now();
    if (
      connectionState.lastAttempt &&
      now - connectionState.lastAttempt < 1000
    ) {
      console.log("Throttling connection attempts - too frequent");
      return;
    }

    // don't connect if already connecting or connected
    if (isConnecting || (socket && socket.readyState === WebSocket.OPEN))
      return;

    isConnecting = true;
    connectionState.lastAttempt = Date.now();
    console.log(`Attempting to connect to ${url}`);

    // clear any previous connection timeout
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
    }

    // close previous socket if it exists
    if (socket) {
      safeCloseSocket(socket);
      socket = null;
    }

    try {
      socket = new WebSocket(url);

      // set connection timeout
      connectionTimeout = setTimeout(() => {
        if (socket && socket.readyState === WebSocket.CONNECTING) {
          console.log("Connection timeout, forcing close and reconnect");
          const tempSocket = socket;
          socket = null; // clear reference first
          safeCloseSocket(tempSocket);
          isConnecting = false;

          if (!isCleaningUp) {
            connect();
          }
        }
      }, 10000);

      socket.onopen = () => {
        if (isCleaningUp) return;

        clearTimeout(connectionTimeout);
        connectionTimeout = null;
        console.log("WebSocket connected successfully");
        isConnecting = false;
        connectionState.isConnected = true;
        connectionState.reconnectAttempts = 0;
        connectionState.backoffMs = 1000;
        lastMessageTime = Date.now();

        // process queued messages
        processQueue();

        // start monitoring
        startHeartbeat();
        startConnectionMonitoring();

        if (onOpen) onOpen();
      };

      socket.onmessage = (event) => {
        if (isCleaningUp) return;

        // update last message time
        lastMessageTime = Date.now();

        try {
          const data = JSON.parse(event.data);

          // handle heartbeat messages
          if (data.type === "heartbeat") {
            // respond with pong
            sendRaw(
              JSON.stringify({
                type: "pong",
                timestamp: data.timestamp,
              })
            );
            return;
          }

          if (onMessage) onMessage(event);
        } catch (err) {
          console.error("Error processing message:", err);
          if (onMessage) onMessage(event);
        }
      };

      socket.onerror = (event) => {
        if (isCleaningUp) return;

        console.error("WebSocket error:", event);
        connectionState.isConnected = false;

        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }

        if (onError) onError(event);
      };

      socket.onclose = (event) => {
        if (isCleaningUp) return;

        console.log(
          `WebSocket closed with code: ${event.code}, reason: ${
            event.reason || "No reason provided"
          }, clean: ${event.wasClean}`
        );
        connectionState.isConnected = false;
        isConnecting = false;

        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }

        // stop timers
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (connectionMonitorTimer) clearInterval(connectionMonitorTimer);

        if (onClose) onClose(event);

        // handle reconnection
        if (
          !event.wasClean &&
          connectionState.reconnectAttempts <
            connectionState.maxReconnectAttempts
        ) {
          const backoff =
            connectionState.backoffMs *
            Math.pow(1.5, connectionState.reconnectAttempts);
          console.log(
            `Scheduling reconnect in ${backoff}ms (attempt ${
              connectionState.reconnectAttempts + 1
            }/${connectionState.maxReconnectAttempts})`
          );

          connectionState.reconnectAttempts++;
          if (reconnectTimer) clearTimeout(reconnectTimer);

          const reconnectDelay = Math.max(2000, backoff);
          reconnectTimer = setTimeout(connect, reconnectDelay);
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      isConnecting = false;

      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }

      // schedule reconnect if allowed
      if (
        !isCleaningUp &&
        connectionState.reconnectAttempts < connectionState.maxReconnectAttempts
      ) {
        console.log(
          `Error creating socket, scheduling reconnect in ${connectionState.backoffMs}ms`
        );
        reconnectTimer = setTimeout(connect, connectionState.backoffMs);
      }
    }
  };

  /**
   * send raw data directly to WebSocket
   * @param {string} data - data to send
   * @returns {boolean} - whether send was successful
   */
  const sendRaw = (data) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(data);
        return true;
      } catch (err) {
        console.error("Error sending data:", err);
        return false;
      }
    }
    return false;
  };

  /**
   * process queued messages
   */
  const processQueue = () => {
    if (isCleaningUp) return;

    if (messageQueue.length > 0) {
      console.log(`Processing message queue (${messageQueue.length} items)`);

      while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        if (!sendRaw(msg)) {
          messageQueue.unshift(msg);
          break;
        }
      }

      // if still has messages and connected, try again
      if (
        !isCleaningUp &&
        messageQueue.length > 0 &&
        socket &&
        socket.readyState === WebSocket.OPEN
      ) {
        setTimeout(processQueue, 500);
      }
    }
  };

  /**
   * send a message or queue if connection not ready
   * @param {string} message - message to send
   * @returns {boolean} - whether message was sent immediately
   */
  const sendMessage = (message) => {
    if (isCleaningUp) return false;

    if (socket && socket.readyState === WebSocket.OPEN) {
      return sendRaw(message);
    } else {
      console.log("Connection not ready, queueing message");
      messageQueue.push(message);

      // try to connect if not connecting
      if (
        !isConnecting &&
        (!socket || socket.readyState === WebSocket.CLOSED)
      ) {
        connect();
      }
      return false;
    }
  };

  // start the connection
  connect();

  // return API for controlling the socket
  return {
    sendMessage,
    isReady: () => socket && socket.readyState === WebSocket.OPEN,
    getConnectionState: () => ({
      ...connectionState,
      readyState: socket ? socket.readyState : -1,
      queueLength: messageQueue.length,
      lastMessageReceived: lastMessageTime
        ? new Date(lastMessageTime).toISOString()
        : null,
    }),
    reconnect: () => {
      if (isCleaningUp) return;

      if (socket) {
        const tempSocket = socket;
        socket = null; // clear reference first
        safeCloseSocket(tempSocket);
      }
      connect();
    },
    cleanup: () => {
      console.log("Cleaning up WebSocket connection");
      isCleaningUp = true;

      // clear all timers at once
      clearAllTimers();

      // clear queue
      messageQueue = [];

      // close socket
      if (socket) {
        const currentSocket = socket;
        socket = null;
        safeCloseSocket(currentSocket, 1000, "Normal closure");
      }
    },
  };
};
