import fs from 'fs/promises';
import path from 'path';

export const ANCHOR_MESSAGES_PATH = path.resolve(process.cwd(), 'src/config/anchorMessages.json');

export interface AnchorMessagesConfig {
    [channelId: string]: string; // channelId: messageId (the anchor message)
}

/**
 * Reads the anchor messages configuration from JSON file.
 * Creates an empty file if it doesn't exist.
 * Returns an empty object if the file is empty or there's a parsing error.
 */
export async function readAnchorMessages(): Promise<AnchorMessagesConfig> {
    try {
        await fs.access(ANCHOR_MESSAGES_PATH);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            // File doesn't exist, create it with an empty object
            await writeAnchorMessages({});
            return {};
        }
        console.error('Error accessing anchorMessages.json:', error);
        return {}; // Return empty config on other access errors
    }

    try {
        const data = await fs.readFile(ANCHOR_MESSAGES_PATH, 'utf-8');
        if (data.trim() === '') {
            // File is empty, return empty object
            return {};
        }
        return JSON.parse(data) as AnchorMessagesConfig;
    } catch (error) {
        console.error('Error reading or parsing anchorMessages.json:', error);
        return {}; // Return empty config on parse error
    }
}

/**
 * Writes the given anchor messages configuration to the JSON file.
 */
export async function writeAnchorMessages(config: AnchorMessagesConfig): Promise<void> {
    try {
        await fs.writeFile(ANCHOR_MESSAGES_PATH, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('Error writing anchorMessages.json:', error);
    }
}

/**
 * Retrieves the anchor message ID for a given channel.
 * @param channelId The ID of the channel.
 * @returns The anchor message ID, or undefined if not set.
 */
export async function getAnchorMessageId(channelId: string): Promise<string | undefined> {
    const config = await readAnchorMessages();
    return config[channelId];
}

/**
 * Sets the anchor message ID for a given channel.
 * @param channelId The ID of the channel.
 * @param messageId The ID of the message to be set as anchor.
 */
export async function setAnchorMessageId(channelId: string, messageId: string): Promise<void> {
    const config = await readAnchorMessages();
    config[channelId] = messageId;
    await writeAnchorMessages(config);
}

/**
 * Clears the anchor message ID for a given channel.
 * @param channelId The ID of the channel.
 */
export async function clearAnchorMessageId(channelId: string): Promise<void> {
    const config = await readAnchorMessages();
    if (config[channelId]) {
        delete config[channelId];
        await writeAnchorMessages(config);
    }
} 