export const CredentialsCommands = {
    UPDATE_ELEMENTS: "updateElements",
} as const;

export type CredentialsCommand = (typeof CredentialsCommands)[keyof typeof CredentialsCommands];

