import { SerializedEditorState } from 'lexical'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

import { useApp } from '../../contexts/AppContext'
import { useRAG } from '../../contexts/RAGContext'
import { SelectVector } from '../../database/schema'
import { Mentionable } from '../../types/mentionable'
import { openMarkdownFile } from '../../utils/obsidian'
import { t } from '../../lang/helpers'

import SearchInputWithActions, { SearchInputRef } from './chat-input/SearchInputWithActions'
import { editorStateToPlainText } from './chat-input/utils/editor-state-to-plain-text'

// File group result interface
interface FileGroup {
	path: string
	fileName: string
	maxSimilarity: number
	blocks: (Omit<SelectVector, 'embedding'> & { similarity: number })[]
}

const SearchView = () => {
	const { getRAGEngine } = useRAG()
	const app = useApp()
	const searchInputRef = useRef<SearchInputRef>(null)
	const [searchResults, setSearchResults] = useState<(Omit<SelectVector, 'embedding'> & { similarity: number })[]>([])
	const [isSearching, setIsSearching] = useState(false)
	const [hasSearched, setHasSearched] = useState(false)
	// Expand state management - default all expanded
	const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
	// Add: mentionables state management
	const [mentionables, setMentionables] = useState<Mentionable[]>([])
	const [searchEditorState, setSearchEditorState] = useState<SerializedEditorState | null>(null)

	const handleSearch = useCallback(async (editorState?: SerializedEditorState) => {
		let searchTerm = ''
		
		if (editorState) {
			// Use a mature function to extract text content from Lexical editor state
			searchTerm = editorStateToPlainText(editorState).trim()
		}
		
		if (!searchTerm.trim()) {
			setSearchResults([])
			setHasSearched(false)
			return
		}
		
		setIsSearching(true)
		setHasSearched(true)
		
		try {
			const ragEngine = await getRAGEngine()
			const results = await ragEngine.processQuery({
				query: searchTerm,
				limit: 50, // Use the limit selected by the user
			})
			
			setSearchResults(results)
			// Default expand all files
			// const uniquePaths = new Set(results.map(r => r.path))
			// setExpandedFiles(new Set(uniquePaths))
		} catch (error) {
			console.error('Search failed:', error)
			setSearchResults([])
		} finally {
			setIsSearching(false)
		}
	}, [getRAGEngine])

	const handleResultClick = (result: Omit<SelectVector, 'embedding'> & { similarity: number }) => {
		// If the user is selecting text, do not trigger the click event
		const selection = window.getSelection()
		if (selection && selection.toString().length > 0) {
			return
		}

		console.debug('🔍 [SearchView] Clicked search result:', {
			id: result.id,
			path: result.path,
			startLine: result.metadata?.startLine,
			endLine: result.metadata?.endLine,
			content: result.content?.substring(0, 100) + '...',
			similarity: result.similarity
		})

		// Check if the path exists
		if (!result.path) {
			console.error('❌ [SearchView] File path is empty')
			return
		}

		// Check if the file exists in the vault
		const file = app.vault.getFileByPath(result.path)
		if (!file) {
			console.error('❌ [SearchView] File not found in vault:', result.path)
			return
		}

		console.debug('✅ [SearchView] File exists, preparing to open:', {
			file: file.path,
			startLine: result.metadata?.startLine
		})

		try {
			openMarkdownFile(app, result.path, result.metadata.startLine)
			console.debug('✅ [SearchView] Successfully called openMarkdownFile')
		} catch (error) {
			console.error('❌ [SearchView] Failed to call openMarkdownFile:', error)
		}
	}

	const toggleFileExpansion = (filePath: string) => {
		// If the user is selecting text, do not trigger the click event
		const selection = window.getSelection()
		if (selection && selection.toString().length > 0) {
			return
		}

		const newExpandedFiles = new Set(expandedFiles)
		if (newExpandedFiles.has(filePath)) {
			newExpandedFiles.delete(filePath)
		} else {
			newExpandedFiles.add(filePath)
		}
		setExpandedFiles(newExpandedFiles)
	}

	// Limit the number of displayed lines of text
	const truncateContent = (content: string, maxLines: number = 3) => {
		const lines = content.split('\n')
		if (lines.length <= maxLines) {
			return content
		}
		return lines.slice(0, maxLines).join('\n') + '...'
	}

	// Render markdown content
	const renderMarkdownContent = (content: string, maxLines: number = 3) => {
		const truncatedContent = truncateContent(content, maxLines)
		return (
			<ReactMarkdown
				className="obsidian-markdown-content"
				components={{
					// Simplify rendering, remove some complex elements
					h1: ({ children }) => <h4>{children}</h4>,
					h2: ({ children }) => <h4>{children}</h4>,
					h3: ({ children }) => <h4>{children}</h4>,
					h4: ({ children }) => <h4>{children}</h4>,
					h5: ({ children }) => <h5>{children}</h5>,
					h6: ({ children }) => <h5>{children}</h5>,
					// Remove image display to avoid layout issues
					img: () => <span className="obsidian-image-placeholder">[图片]</span>,
					// Code block style
					code: ({ children, inline }: { children: React.ReactNode; inline?: boolean; [key: string]: unknown }) => {
						if (inline) {
							return <code className="obsidian-inline-code">{children}</code>
						}
						return <pre className="obsidian-code-block"><code>{children}</code></pre>
					},
					// Link style
					a: ({ href, children }) => (
						<span className="obsidian-link" title={href}>{children}</span>
					),
				}}
			>
				{truncatedContent}
			</ReactMarkdown>
		)
	}

	// Group and sort by file
	const groupedResults = useMemo(() => {
		if (!searchResults.length) return []

		// Group by file path
		const fileGroups = new Map<string, FileGroup>()
		
		searchResults.forEach(result => {
			const filePath = result.path
			const fileName = filePath.split('/').pop() || filePath
			
			if (!fileGroups.has(filePath)) {
				fileGroups.set(filePath, {
					path: filePath,
					fileName,
					maxSimilarity: result.similarity,
					blocks: []
				})
			}
			
			const group = fileGroups.get(filePath)
			if (group) {
				group.blocks.push(result)
				// Update highest similarity
				if (result.similarity > group.maxSimilarity) {
					group.maxSimilarity = result.similarity
				}
			}
		})

		// Sort blocks within each file by similarity
		fileGroups.forEach(group => {
			group.blocks.sort((a, b) => b.similarity - a.similarity)
		})

		// Sort files by highest similarity
		return Array.from(fileGroups.values()).sort((a, b) => b.maxSimilarity - a.maxSimilarity)
	}, [searchResults])

	const totalBlocks = searchResults.length
	const totalFiles = groupedResults.length

	return (
		<div className="obsidian-search-container">
			{/* Search input box */}
			<div className="obsidian-search-header">
				<SearchInputWithActions
					ref={searchInputRef}
					initialSerializedEditorState={searchEditorState}
					onChange={setSearchEditorState}
					onSubmit={handleSearch}
					mentionables={mentionables}
					setMentionables={setMentionables}
					placeholder={t('search.semanticSearchPlaceholder')}
					autoFocus={true}
					disabled={isSearching}
				/>
			</div>

			{/* Result statistics */}
			{hasSearched && !isSearching && (
				<div className="obsidian-search-stats">
					{totalFiles} files, {totalBlocks} blocks
				</div>
			)}

			{/* Search progress */}
			{isSearching && (
				<div className="obsidian-search-loading">
					Searching...
				</div>
			)}

			{/* Search results */}
			<div className="obsidian-search-results">
				{!isSearching && groupedResults.length > 0 && (
					<div className="obsidian-results-list">
						{groupedResults.map((fileGroup) => (
							<div key={fileGroup.path} className="obsidian-file-group">
								{/* File header */}
								<div 
									className="obsidian-file-header"
									onClick={() => toggleFileExpansion(fileGroup.path)}
								>
									<div className="obsidian-file-header-content">
										<div className="obsidian-file-header-top">
											<div className="obsidian-file-header-left">
												{expandedFiles.has(fileGroup.path) ? (
													<ChevronDown size={16} className="obsidian-expand-icon" />
												) : (
													<ChevronRight size={16} className="obsidian-expand-icon" />
												)}
												{/* <span className="obsidian-file-index">{fileIndex + 1}</span> */}
												<span className="obsidian-file-name">{fileGroup.fileName}</span>
											</div>
											<div className="obsidian-file-header-right">
												{/* <span className="obsidian-file-blocks">{fileGroup.blocks.length} 块</span> */}
												{/* <span className="obsidian-file-similarity">
													{fileGroup.maxSimilarity.toFixed(3)}
												</span> */}
											</div>
										</div>
										<div className="obsidian-file-path-row">
											<span className="obsidian-file-path">{fileGroup.path}</span>
										</div>
									</div>
								</div>

								{/* File block list */}
								{expandedFiles.has(fileGroup.path) && (
									<div className="obsidian-file-blocks">
										{fileGroup.blocks.map((result, blockIndex) => (
											<div
												key={result.id}
												className="obsidian-result-item"
												onClick={() => handleResultClick(result)}
											>
												<div className="obsidian-result-header">
													<span className="obsidian-result-index">{blockIndex + 1}</span>
													<span className="obsidian-result-location">
														L{result.metadata.startLine}-{result.metadata.endLine}
													</span>
													<span className="obsidian-result-similarity">
														{result.similarity.toFixed(3)}
													</span>
												</div>
												<div className="obsidian-result-content">
													{renderMarkdownContent(result.content)}
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						))}
					</div>
				)}
				
				{!isSearching && hasSearched && groupedResults.length === 0 && (
					<div className="obsidian-no-results">
						<p>No results found</p>
					</div>
				)}
			</div>

			{/* Styles */}
			<style>
				{`
				.obsidian-search-container {
					display: flex;
					flex-direction: column;
					height: 100%;
					font-family: var(--font-interface);
				}

				.obsidian-search-header {
					padding: 12px;
				}

				.obsidian-search-stats {
					padding: 8px 12px;
					font-size: var(--font-ui-small);
					color: var(--text-muted);
				}

				.obsidian-search-loading {
					padding: 20px;
					text-align: center;
					color: var(--text-muted);
					font-size: var(--font-ui-medium);
				}

				.obsidian-search-results {
					flex: 1;
					overflow-y: auto;
				}

				.obsidian-results-list {
					display: flex;
					flex-direction: column;
				}

				.obsidian-file-group {
					border-bottom: 1px solid var(--background-modifier-border);
				}

				.obsidian-file-header {
					padding: 12px;
					background-color: var(--background-secondary);
					cursor: pointer;
					transition: background-color 0.1s ease;
					border-bottom: 1px solid var(--background-modifier-border);
				}

				.obsidian-file-header:hover {
					background-color: var(--background-modifier-hover);
				}

				.obsidian-file-header-content {
					display: flex;
					flex-direction: column;
					gap: 4px;
				}

				.obsidian-file-header-top {
					display: flex;
					align-items: center;
					justify-content: space-between;
				}

				.obsidian-file-header-left {
					display: flex;
					align-items: center;
					gap: 8px;
					flex: 1;
					min-width: 0;
				}

				.obsidian-file-header-right {
					display: flex;
					align-items: center;
					gap: 12px;
					flex-shrink: 0;
				}

				.obsidian-file-path-row {
					margin-left: 24px;
				}

				.obsidian-expand-icon {
					color: var(--text-muted);
					flex-shrink: 0;
				}

				.obsidian-file-index {
					color: var(--text-muted);
					font-size: var(--font-ui-small);
					font-weight: 500;
					min-width: 20px;
					flex-shrink: 0;
				}

				.obsidian-file-name {
					color: var(--text-normal);
					font-size: var(--font-ui-medium);
					font-weight: 500;
					flex-shrink: 0;
					user-select: text;
					cursor: text;
				}

				.obsidian-file-path {
					color: var(--text-muted);
					font-size: var(--font-ui-smaller);
					font-family: var(--font-monospace);
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}

				.obsidian-file-blocks {
					color: var(--text-muted);
					font-size: var(--font-ui-small);
				}

				.obsidian-file-similarity {
					color: var(--text-muted);
					font-size: var(--font-ui-smaller);
					font-family: var(--font-monospace);
				}

				.obsidian-file-blocks {
					background-color: var(--background-primary);
				}

				.obsidian-result-item {
					padding: 12px 12px 12px 32px;
					border-bottom: 1px solid var(--background-modifier-border-focus);
					cursor: pointer;
					transition: background-color 0.1s ease;
				}

				.obsidian-result-item:hover {
					background-color: var(--background-modifier-hover);
				}

				.obsidian-result-item:last-child {
					border-bottom: none;
				}

				.obsidian-result-header {
					display: flex;
					align-items: center;
					margin-bottom: 6px;
					gap: 8px;
				}

				.obsidian-result-index {
					color: var(--text-muted);
					font-size: var(--font-ui-small);
					font-weight: 500;
					min-width: 16px;
					flex-shrink: 0;
				}

				.obsidian-result-location {
					color: var(--text-muted);
					font-size: var(--font-ui-smaller);
					font-family: var(--font-monospace);
					flex-grow: 1;
				}

				.obsidian-result-similarity {
					color: var(--text-muted);
					font-size: var(--font-ui-smaller);
					font-family: var(--font-monospace);
					flex-shrink: 0;
				}

				.obsidian-result-content {
					color: var(--text-normal);
					font-size: var(--font-ui-medium);
					line-height: 1.4;
					word-wrap: break-word;
					user-select: text;
					cursor: text;
				}

				/* Markdown rendering styles */
				.obsidian-markdown-content {
					color: var(--text-normal);
					font-size: var(--font-ui-medium);
					line-height: 1.4;
					user-select: text;
					cursor: text;
				}

				.obsidian-markdown-content h4,
				.obsidian-markdown-content h5 {
					margin: 4px 0;
					color: var(--text-normal);
					font-weight: 600;
				}

				.obsidian-markdown-content p {
					margin: 4px 0;
				}

				.obsidian-markdown-content ul,
				.obsidian-markdown-content ol {
					margin: 4px 0;
					padding-left: 16px;
				}

				.obsidian-markdown-content li {
					margin: 2px 0;
				}

				.obsidian-inline-code {
					background-color: var(--background-modifier-border);
					color: var(--text-accent);
					padding: 2px 4px;
					border-radius: var(--radius-s);
					font-family: var(--font-monospace);
					font-size: 0.9em;
				}

				.obsidian-code-block {
					background-color: var(--background-modifier-border);
					padding: 8px;
					border-radius: var(--radius-s);
					margin: 4px 0;
					overflow-x: auto;
				}

				.obsidian-code-block code {
					font-family: var(--font-monospace);
					font-size: var(--font-ui-smaller);
					color: var(--text-normal);
				}

				.obsidian-link {
					color: var(--text-accent);
					text-decoration: underline;
					cursor: pointer;
				}

				.obsidian-image-placeholder {
					color: var(--text-muted);
					font-style: italic;
					background-color: var(--background-modifier-border);
					padding: 2px 6px;
					border-radius: var(--radius-s);
					font-size: var(--font-ui-smaller);
				}

				.obsidian-markdown-content blockquote {
					border-left: 3px solid var(--text-accent);
					padding-left: 12px;
					margin: 4px 0;
					color: var(--text-muted);
					font-style: italic;
				}

				.obsidian-markdown-content strong {
					font-weight: 600;
					color: var(--text-normal);
				}

				.obsidian-markdown-content em {
					font-style: italic;
					color: var(--text-muted);
				}

				.obsidian-no-results {
					padding: 40px 20px;
					text-align: center;
					color: var(--text-muted);
				}

				.obsidian-no-results p {
					margin: 0;
					font-size: var(--font-ui-medium);
				}
				`}
			</style>
		</div>
	)
}

export default SearchView 

