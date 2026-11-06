export interface RoomConnectionClient {
  on(event: string, handler: (...args: any[]) => void): void;
  off(event: string, handler: (...args: any[]) => void): void;
  connect(url: string, token: string): Promise<void>;
  disconnect(): void;
}

export interface RoomConnectionListener {
  event: string;
  handler: (...args: any[]) => void;
}

export function createRoomConnectionAttempt(
  client: RoomConnectionClient,
  url: string,
  token: string,
  listeners: RoomConnectionListener[],
  timeoutMs = 20_000,
) {
  let active = true;
  let disconnected = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let connectionPromise: Promise<void> | undefined;

  listeners.forEach(({ event, handler }) => client.on(event, handler));

  const connect = async () => {
    if (connectionPromise) return connectionPromise;
    connectionPromise = (async () => {
      try {
        await Promise.race([
          client.connect(url, token),
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(
              () => reject(new Error(`Connection timed out after ${timeoutMs} milliseconds.`)),
              timeoutMs,
            );
          }),
        ]);
      } finally {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
      }
    })();

    return connectionPromise;
  };

  const cleanup = () => {
    if (!active) return;
    active = false;
    listeners.forEach(({ event, handler }) => client.off(event, handler));
    if (!disconnected) {
      disconnected = true;
      client.disconnect();
    }
  };

  return {
    connect,
    cleanup,
    isActive: () => active,
  };
}
