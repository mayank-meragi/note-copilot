import { App } from "obsidian";
import {
	MAX_RESULTS,
	truncateLine,
	SearchResult,
	formatResults,
} from '../search-common';

type SearchMatchApi = {
	match: string;
	offset: number;
};

type ResultNoteApi = {
	score: number;
	vault: string;
	path: string;
	basename: string;
	foundWords: string[];
	matches: SearchMatchApi[];
	excerpt: string;
};

type OmnisearchApi = {
	search: (query: string) => Promise<ResultNoteApi[]>;
	// ... other API methods
};

declare global {
	interface Window {
		omnisearch: OmnisearchApi;
	}
}

/**
 * Checks if the Omnisearch plugin's API is available.
 * @returns {boolean} True if the API is ready, false otherwise.
 */
function isOmnisearchAvailable(): boolean {
	return window.omnisearch && typeof window.omnisearch.search === "function";
}

/**
 * Finds the line number, column number, and content for a given character offset in a file.
 * @param allLines All lines in the file.
 * @param offset The character offset of the match.
 * @returns An object with line number, column number, and the full line content.
 */
function findLineAndColumnFromOffset(
	allLines: string[],
	offset: number
): { lineNumber: number; columnNumber: number; lineContent: string } {
	let charCount = 0;
	for (let i = 0; i < allLines.length; i++) {
		const line = allLines[i];
		// The line ending length (1 for \n, 2 for \r\n) can vary.
		// A simple +1 is a reasonable approximation for this calculation.
		const lineEndOffset = charCount + line.length + 1; 

		if (offset < lineEndOffset) {
			const columnNumber = offset - charCount;
			return { lineNumber: i, columnNumber, lineContent: line };
		}
		charCount = lineEndOffset;
	}
	return { lineNumber: -1, columnNumber: -1, lineContent: "" };
}

/**
 * Searches using Omnisearch and builds context for each match.
 * @param query The search query for Omnisearch. Note: Omnisearch does not support full regex.
 * @param app The Obsidian App instance.
 * @returns A formatted string of search results.
 */
export async function searchFilesWithOmnisearch(
	query: string,
	app: App,
): Promise<string> {
	try {
		if (!isOmnisearchAvailable()) {
			throw new Error(
				"Omnisearch plugin not found or not active. Please install and enable it to use this search feature."
			);
		}

		// Omnisearch is not a regex engine.
		// The `query` will be treated as a keyword/fuzzy search by the plugin.
		const apiResults = await window.omnisearch.search(query);
		if (!apiResults || apiResults.length === 0) {
			throw new Error("No results found.");
		}

		const results: SearchResult[] = [];

		for (const result of apiResults) {
			if (results.length >= MAX_RESULTS) {
				break; // Stop processing new files if we have enough results
			}
			if (!result.matches || result.matches.length === 0) continue;

			const fileContent = await app.vault.adapter.read(result.path);
			const allLines = fileContent.split("\n");

			for (const match of result.matches) {
				if (results.length >= MAX_RESULTS) {
					break; // Stop processing matches if we have enough results
				}

				const { lineNumber, columnNumber, lineContent } = findLineAndColumnFromOffset(
					allLines,
					match.offset
				);

				if (lineNumber === -1) continue;

				const searchResult: SearchResult = {
					file: result.path,
					line: lineNumber + 1, // ripgrep is 1-based, so we adjust
					column: columnNumber + 1,
					match: truncateLine(lineContent.trimEnd()),
					beforeContext: lineNumber > 0 ? [truncateLine(allLines[lineNumber - 1].trimEnd())] : [],
					afterContext:
						lineNumber < allLines.length - 1
							? [truncateLine(allLines[lineNumber + 1].trimEnd())]
							: [],
				};
				results.push(searchResult);
			}
		}

		return formatResults(results, ".\\");
	} catch (error) {
		console.error("Error during Omnisearch processing:", error);
		return "An error occurred during the search.";
	}
}