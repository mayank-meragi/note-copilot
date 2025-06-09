import { minimatch } from 'minimatch'
import { TFile, TFolder, Vault } from 'obsidian'

export const findFilesMatchingPatterns = async (
	patterns: string[],
	vault: Vault,
) => {
	const files = vault.getMarkdownFiles()
	return files.filter((file) => {
		return patterns.some((pattern) => minimatch(file.path, pattern))
	})
}

export const listFilesAndFolders = async (vault: Vault, path: string) => {
	const folder = vault.getAbstractFileByPath(path)
	const childrenFiles: string[] = []
	const childrenFolders: string[] = []
	if (folder instanceof TFolder) {
		folder.children.forEach((child) => {
			if (child instanceof TFile) {
				childrenFiles.push(child.path)
			} else if (child instanceof TFolder) {
				childrenFolders.push(child.path + "/")
			}
		})
		return [...childrenFolders, ...childrenFiles]
	}
	return []
}

export const matchSearchFiles = async (vault: Vault, path: string, query: string, file_pattern: string) => {
	
}

export const regexSearchFiles = async (vault: Vault, path: string, regex: string, file_pattern: string) => {
	
}
