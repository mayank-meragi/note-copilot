import { App } from "obsidian";
import { searchFilesWithCorePlugin } from '../match/coreplugin-match'

/**
 * Performs a regular expression search using Obsidian's core search plugin.
 *
 * @param app The Obsidian App instance.
 * @param regex The regular expression to search for.
 * @returns A promise that resolves to a formatted string of search results.
 */
export async function regexSearchFilesWithCorePlugin(
    regex: string,
    app: App,
): Promise<string> {
    const query = "/" + regex + "/";
    return searchFilesWithCorePlugin(query, app);
}