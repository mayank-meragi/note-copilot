import { App, TFile  } from "obsidian";
import {
    MAX_RESULTS,
    truncateLine,
    findLineDetails,
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
    try {
        const searchPlugin = (app as any).internalPlugins.plugins['global-search']?.instance;
        if (!searchPlugin) {
            throw new Error("Core search plugin is not available.");
        }

        // This function opens the search pane and executes the search.
        // It does not return the results directly.
        searchPlugin.openGlobalSearch(query);

        // We must wait for the search to execute and the UI to update.
        await new Promise(resolve => setTimeout(resolve, 500));

        const searchLeaf = app.workspace.getLeavesOfType('search')[0];
        if (!searchLeaf) {
            throw new Error("No active search pane found after triggering search.");
        }

        // @ts-ignore
        const searchResultsMap = (searchLeaf.view as any).dom.resultDomLookup;
        if (!searchResultsMap || searchResultsMap.size === 0) {
			console.error("No results found.");
			return "No results found."
        }

        const results: SearchResult[] = [];
        const vault = app.vault;

        for (const [file, fileMatches] of searchResultsMap.entries()) {
            if (results.length >= MAX_RESULTS) {
                break;
            }

            const content = await vault.cachedRead(file as TFile);
            const lines = content.split('\n');

            // `fileMatches.result.content` holds an array of matches for the file.
            // Each match is an array: [matched_text, start_offset]
            for (const match of fileMatches.result.content) {
                if (results.length >= MAX_RESULTS) break;
                
                const startOffset = match[1];
                const { lineNumber, columnNumber, lineContent } = findLineDetails(lines, startOffset);

                if (lineNumber === -1) continue;

                results.push({
                    file: file.path,
                    line: lineNumber + 1, // ripgrep is 1-based, so we adjust
                    column: columnNumber + 1,
                    match: truncateLine(lineContent.trimEnd()),
                    beforeContext: lineNumber > 0 ? [truncateLine(lines[lineNumber - 1].trimEnd())] : [],
                    afterContext:
                        lineNumber < lines.length - 1
                            ? [truncateLine(lines[lineNumber + 1].trimEnd())]
                            : [],
                });
            }
        }

        return formatResults(results, ".\\");
    } catch (error) {
		console.error("Error during core plugin processing:", error);
		return "An error occurred during the search.";
	}
}