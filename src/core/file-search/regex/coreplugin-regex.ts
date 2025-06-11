import { App } from "obsidian";
import { matchSearchUsingCorePlugin } from '../match/coreplugin-match'

/**
 * Performs a regular expression search using Obsidian's core search plugin.
 *
 * @param app The Obsidian App instance.
 * @param regex The regular expression to search for.
 * @returns A promise that resolves to a formatted string of search results.
 */
export async function regexSearchUsingCorePlugin(
    regex: string,
    app: App,
): Promise<string> {
    const regexQuery = `/${regex}/`;
    return matchSearchUsingCorePlugin(regexQuery, app);
}