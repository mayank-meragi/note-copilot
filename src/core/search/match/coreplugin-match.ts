import { App } from "obsidian";
import {
    MAX_RESULTS,
    truncateLine,
    SearchResult,
    formatResults,
} from '../search-common';

/**
 * Searches using Obsidian's core search plugin and builds context for each match.
 *
 * @param app The Obsidian App instance.
 * @param query The query to search for.
 * @returns A promise that resolves to a formatted string of search results.
 */
export async function searchFilesWithCorePlugin(
    query: string,
    app: App,
): Promise<string> {
    const searchPlugin = (app as any).internalPlugins.plugins['global-search']?.instance;
    if (!searchPlugin) {
        throw new Error("Core search plugin is not available.");
    }

    // The core search function is not officially documented and may change.
    // This is based on community findings and common usage in other plugins.
    const searchResults = await new Promise<any[]>((resolve) => {
        const unregister = searchPlugin.on("search-results", (results: any) => {
            unregister();
            resolve(results);
        });
        searchPlugin.openGlobalSearch(query);
    });

    const results: SearchResult[] = [];
    const vault = app.vault;

    for (const fileMatches of Object.values(searchResults) as any) {
        if (results.length >= MAX_RESULTS) {
            break;
        }

        const file = vault.getAbstractFileByPath(fileMatches.file.path);
        if (!file || !('read' in file)) {
            continue;
        }

        const content = await vault.cachedRead(file as any);
        const lines = content.split('\n');

        for (const match of fileMatches.result.content) {
            if (results.length >= MAX_RESULTS) {
                break;
            }

            const [matchText, startOffset] = match;
            let charCount = 0;
            let lineNumber = 0;
            let column = 0;
            let lineContent = "";

            for (let i = 0; i < lines.length; i++) {
                const lineLength = lines[i].length + 1; // +1 for the newline character
                if (charCount + lineLength > startOffset) {
                    lineNumber = i + 1;
                    column = startOffset - charCount + 1;
                    lineContent = lines[i];
                    break;
                }
                charCount += lineLength;
            }

            results.push({
                file: fileMatches.file.path,
                line: lineNumber,
                column: column,
                match: truncateLine(lineContent.trimEnd()),
                beforeContext: lineNumber > 1 ? [truncateLine(lines[lineNumber - 2].trimEnd())] : [],
                afterContext: lineNumber < lines.length ? [truncateLine(lines[lineNumber].trimEnd())] : [],
            });
        }
    }

    return formatResults(results, ".\\");
}