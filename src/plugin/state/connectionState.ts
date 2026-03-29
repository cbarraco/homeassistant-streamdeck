export const ConnectionState = {
  NOT_CONNECTED: "not_connected",
  INVALID_ADDRESS: "invalid_address",
  INVALID_TOKEN: "invalid_token",
  NEED_RECONNECT: "need_reconnect",
  CONNECTED: "connected",
  DONT_KNOW: "dont_know",
} as const;

export type ConnectionStateValue =
  (typeof ConnectionState)[keyof typeof ConnectionState];
