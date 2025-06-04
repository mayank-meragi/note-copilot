import { App, MarkdownView, TAbstractFile, TFile, TFolder, Vault, getLanguage, htmlToMarkdown, requestUrl } from 'obsidian'

import { editorStateToPlainText } from '../components/chat-view/chat-input/utils/editor-state-to-plain-text'
import { QueryProgressState } from '../components/chat-view/QueryProgress'
import { DiffStrategy } from '../core/diff/DiffStrategy'
import { McpHub } from '../core/mcp/McpHub'
import { SystemPrompt } from '../core/prompts/system'
import { RAGEngine } from '../core/rag/rag-engine'
import { SelectVector } from '../database/schema'
import { ChatAssistantMessage, ChatMessage, ChatUserMessage } from '../types/chat'
import { ContentPart, RequestMessage } from '../types/llm/request'
import {
	MentionableBlock,
	MentionableFile,
	MentionableFolder,
	MentionableImage,
	MentionableUrl,
	MentionableVault
} from '../types/mentionable'
import { InfioSettings } from '../types/settings'
import { CustomModePrompts, Mode, ModeConfig, getFullModeDetails } from "../utils/modes"

import {
	readTFileContent
} from './obsidian'
import { tokenCount } from './token'
import { YoutubeTranscript, isYoutubeUrl } from './youtube-transcript'

export function addLineNumbers(content: string, startLine: number = 1): string {
	const lines = content.split("\n")
	const maxLineNumberWidth = String(startLine + lines.length - 1).length
	return lines
		.map((line, index) => {
			const lineNumber = String(startLine + index).padStart(maxLineNumberWidth, " ")
			return `${lineNumber} | ${line}`
		})
		.join("\n")
}

export function getFullLanguageName(code: string): string {
	try {
		return new Intl.DisplayNames([code], { type: 'language' }).of(code) || code;
	} catch {
		return code.toUpperCase();
	}
}

async function getFolderTreeContent(path: TFolder): Promise<string> {
	try {
		const entries = path.children
		let folderContent = ""
		entries.forEach((entry, index) => {
			const isLast = index === entries.length - 1
			const linePrefix = isLast ? "└── " : "├── "
			if (entry instanceof TFile) {
				folderContent += `${linePrefix}${entry.name}\n`
			} else if (entry instanceof TFolder) {
				folderContent += `${linePrefix}${entry.name}/\n`
			} else {
				folderContent += `${linePrefix}${entry.name}\n`
			}
		})
		return folderContent
	} catch (error) {
		throw new Error(`Failed to access path "${path.path}": ${error.message}`)
	}
}

async function getFileOrFolderContent(path: TAbstractFile, vault: Vault): Promise<string> {
	try {
		if (path instanceof TFile) {
			if (path.extension != 'md') {
				return "(Binary file, unable to display content)"
			}
			return addLineNumbers(await readTFileContent(path, vault))
		} else if (path instanceof TFolder) {
			const entries = path.children
			let folderContent = ""
			const fileContentPromises: Promise<string | undefined>[] = []
			entries.forEach((entry, index) => {
				const isLast = index === entries.length - 1
				const linePrefix = isLast ? "└── " : "├── "
				if (entry instanceof TFile) {
					folderContent += `${linePrefix}${entry.name}\n`
					fileContentPromises.push(
						(async () => {
							try {
								if (entry.extension != 'md') {
									return undefined
								}
								const content = addLineNumbers(await readTFileContent(entry, vault))
								return `<file_content path="${entry.path}">\n${content}\n</file_content>`
							} catch (error) {
								return undefined
							}
						})(),
					)
				} else if (entry instanceof TFolder) {
					folderContent += `${linePrefix}${entry.name}/\n`
				} else {
					folderContent += `${linePrefix}${entry.name}\n`
				}
			})
			const fileContents = (await Promise.all(fileContentPromises)).filter((content) => content)
			return `${folderContent}\n${fileContents.join("\n\n")}`.trim()
		} else {
			return `(Failed to read contents of ${path.path})`
		}
	} catch (error) {
		throw new Error(`Failed to access path "${path.path}": ${error.message}`)
	}
}

export class PromptGenerator {
	private getRagEngine: () => Promise<RAGEngine>
	private app: App
	private settings: InfioSettings
	private diffStrategy: DiffStrategy
	private systemPrompt: SystemPrompt
	private customModePrompts: CustomModePrompts | null = null
	private customModeList: ModeConfig[] | null = null
	private getMcpHub: () => Promise<McpHub> | null = null
	private static readonly EMPTY_ASSISTANT_MESSAGE: RequestMessage = {
		role: 'assistant',
		content: '',
	}

	constructor(
		getRagEngine: () => Promise<RAGEngine>,
		app: App,
		settings: InfioSettings,
		diffStrategy?: DiffStrategy,
		customModePrompts?: CustomModePrompts,
		customModeList?: ModeConfig[],
		getMcpHub?: () => Promise<McpHub>,
	) {
		this.getRagEngine = getRagEngine
		this.app = app
		this.settings = settings
		this.diffStrategy = diffStrategy
		this.systemPrompt = new SystemPrompt(this.app)
		this.customModePrompts = customModePrompts ?? null
		this.customModeList = customModeList ?? null
		this.getMcpHub = getMcpHub ?? null
	}

	public async generateRequestMessages({
		messages,
		useVaultSearch,
		onQueryProgressChange,
	}: {
		messages: ChatMessage[]
		useVaultSearch?: boolean
		onQueryProgressChange?: (queryProgress: QueryProgressState) => void
	}): Promise<{
		requestMessages: RequestMessage[]
		compiledMessages: ChatMessage[]
	}> {
		if (messages.length === 0) {
			throw new Error('No messages provided')
		}
		const lastUserMessage = messages[messages.length - 1]
		if (lastUserMessage.role !== 'user') {
			throw new Error('Last message is not a user message')
		}
		const isNewChat = messages.filter(message => message.role === 'user').length === 1

		const { promptContent, similaritySearchResults } =
			await this.compileUserMessagePrompt({
				isNewChat,
				message: lastUserMessage,
				messages,
				useVaultSearch,
				onQueryProgressChange,
			})
		const compiledMessages = [
			...messages.slice(0, -1),
			{
				...lastUserMessage,
				promptContent,
				similaritySearchResults,
			},
		]

		let filesSearchMethod = this.settings.filesSearchMethod
		if (filesSearchMethod === 'auto' && this.settings.embeddingModelId && this.settings.embeddingModelId !== '') {
			filesSearchMethod = 'semantic'
		}

		const userLanguage = getFullLanguageName(getLanguage())

		const systemMessage = await this.getSystemMessageNew(this.settings.mode, filesSearchMethod, userLanguage)

		const requestMessages: RequestMessage[] = [
			systemMessage,
			...compiledMessages.slice(-19)
				.filter((message) => !(message.role === 'assistant' && message.isToolResult))
				.map((message): RequestMessage => {
				if (message.role === 'user') {
					return {
						role: 'user',
						content: message.promptContent ?? '',
					}
				} else {
					return {
						role: 'assistant',
						content: message.content,
					}
				}
			}),
		]

		return {
			requestMessages,
			compiledMessages,
		}
	}

	private async getEnvironmentDetails() {
		let details = ""
		// Obsidian Current File
		details += "\n\n# Obsidian Current File"
		const currentFile = this.app.workspace.getActiveFile()
		if (currentFile) {
			details += `\n${currentFile?.path}`
		} else {
			details += "\n(No current file)"
		}

		// Obsidian Open Tabs
		details += "\n\n# Obsidian Open Tabs"
		const openTabs: string[] = [];
		this.app.workspace.iterateAllLeaves(leaf => {
			if (leaf.view instanceof MarkdownView && leaf.view.file) {
				openTabs.push(leaf.view.file?.path);
			}
		});
		if (openTabs.length === 0) {
			details += "\n(No open tabs)"
		} else {
			details += `\n${openTabs.join("\n")}`
		}

		// Add current time information with timezone
		const now = new Date()
		const formatter = new Intl.DateTimeFormat(undefined, {
			year: "numeric",
			month: "numeric",
			day: "numeric",
			hour: "numeric",
			minute: "numeric",
			second: "numeric",
			hour12: true,
		})
		const timeZone = formatter.resolvedOptions().timeZone
		const timeZoneOffset = -now.getTimezoneOffset() / 60 // Convert to hours and invert sign to match conventional notation
		const timeZoneOffsetStr = `${timeZoneOffset >= 0 ? "+" : ""}${timeZoneOffset}:00`
		details += `\n\n# Current Time\n${formatter.format(now)} (${timeZone}, UTC${timeZoneOffsetStr})`

		// Add current mode details
		const currentMode = this.settings.mode
		const modeDetails = await getFullModeDetails(this.app, currentMode, this.customModeList, this.customModePrompts)
		details += `\n\n# Current Mode\n`
		details += `<slug>${currentMode}</slug>\n`
		details += `<name>${modeDetails.name}</name>\n`

		// // Obsidian Current Folder
		// const currentFolder = this.app.workspace.getActiveFile() ? this.app.workspace.getActiveFile()?.parent?.path : "/"
		// // Obsidian Vault Files and Folders
		// if (currentFolder) {
		// 	details += `\n\n# Obsidian Current Folder (${currentFolder}) Files`
		// 	const filesAndFolders = await listFilesAndFolders(this.app.vault, currentFolder)
		// 	if (filesAndFolders.length > 0) {
		// 		details += `\n${filesAndFolders.filter(Boolean).join("\n")}`
		// 	} else {
		// 		details += "\n(No Markdown files in current folder)"
		// 	}
		// } else {
		// 	details += "\n(No current folder)"
		// }

		return `<environment_details>\n${details.trim()}\n</environment_details>`
	}

	private async compileUserMessagePrompt({
		isNewChat,
		message,
		messages,
		useVaultSearch,
		onQueryProgressChange,
	}: {
		isNewChat: boolean
		message: ChatUserMessage
		messages?: ChatMessage[]
		useVaultSearch?: boolean
		onQueryProgressChange?: (queryProgress: QueryProgressState) => void
	}): Promise<{
		promptContent: ChatUserMessage['promptContent']
		similaritySearchResults?: (Omit<SelectVector, 'embedding'> & {
			similarity: number
		})[]
	}> {
		// Add environment details
		// const environmentDetails = isNewChat
		// 	? await this.getEnvironmentDetails()
		// 	: undefined
		const environmentDetails = await this.getEnvironmentDetails()

		// if isToolCallReturn, add read_file_content to promptContent
		if (message.content === null) {
			return {
				promptContent: message.promptContent,
				similaritySearchResults: undefined,
			}
		}

		const query = editorStateToPlainText(message.content)
		let similaritySearchResults = undefined

		useVaultSearch =
			// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
			useVaultSearch ||
			message.mentionables.some(
				(m): m is MentionableVault => m.type === 'vault',
			)

		onQueryProgressChange?.({
			type: 'reading-mentionables',
		})

		const taskPrompt = isNewChat ? `<task>\n${query}\n</task>` : `<feedback>\n${query}\n</feedback>`

		// user mention files
		const files = message.mentionables
			.filter((m): m is MentionableFile => m.type === 'file')
			.map((m) => m.file)
		let fileContentsPrompts = files.length > 0
			? (await Promise.all(files.map(async (file) => {
				const content = await getFileOrFolderContent(file, this.app.vault)
				return `<file_content path="${file.path}">\n${content}\n</file_content>`
			}))).join('\n')
			: undefined

		// user mention folders
		const folders = message.mentionables
			.filter((m): m is MentionableFolder => m.type === 'folder')
			.map((m) => m.folder)
		let folderContentsPrompts = folders.length > 0
			? (await Promise.all(folders.map(async (folder) => {
				const content = await getFileOrFolderContent(folder, this.app.vault)
				return `<folder_content path="${folder.path}">\n${content}\n</folder_content>`
			}))).join('\n')
			: undefined

		// user mention blocks
		const blocks = message.mentionables.filter(
			(m): m is MentionableBlock => m.type === 'block',
		)
		const blockContentsPrompt = blocks.length > 0
			? blocks
				.map(({ file, content, startLine, endLine }) => {
					const content_with_line_numbers = addLineNumbers(content, startLine)
					return `<file_block_content location="${file.path}#L${startLine}-${endLine}">\n${content_with_line_numbers}\n</file_block_content>`
				})
				.join('\n')
			: undefined

		// user mention urls
		const urls = message.mentionables.filter(
			(m): m is MentionableUrl => m.type === 'url',
		)
		const urlContents = await Promise.all(
			urls.map(async ({ url }) => ({
				url,
				content: await this.getWebsiteContent(url)
			}))
		)
		const urlContentsPrompt = urlContents.length > 0
			? urlContents
				.map(({ url, content }) => (
					`<url_content url="${url}">\n${content}\n</url_content>`
				))
				.join('\n') : undefined

		// current file
		const currentFile = message.mentionables
			.filter((m): m is MentionableFile => m.type === 'current-file')
			.first()
		const currentFileContent = currentFile && currentFile.file != null
			? await getFileOrFolderContent(currentFile.file, this.app.vault)
			: undefined

		// Check if current file content should be included
		let shouldIncludeCurrentFile = false
		if (currentFileContent && this.settings.mode !== 'research') {
			if (isNewChat) {
				// For new chats, always include current file content
				shouldIncludeCurrentFile = true
			} else {
				// For continuing chats, check if current file content already exists in history
				const currentFilePromptTag = `<current_file_content path="${currentFile.file.path}">`
				const hasCurrentFileInHistory = messages?.some((msg) => {
					if (msg.role === 'user' && msg.promptContent) {
						if (typeof msg.promptContent === 'string') {
							// Handle string type promptContent
							return msg.promptContent.includes(currentFilePromptTag)
						} else if (Array.isArray(msg.promptContent)) {
							// Handle ContentPart[] type promptContent
							return msg.promptContent.some((part) => {
								if (part.type === 'text' && part.text) {
									return part.text.includes(currentFilePromptTag)
								}
								return false
							})
						}
					}
					return false
				}) || false
				// Only include if not already in history
				shouldIncludeCurrentFile = !hasCurrentFileInHistory
			}
		}

		const currentFileContentPrompt = shouldIncludeCurrentFile
			? `<current_file_content path="${currentFile.file.path}">\n${currentFileContent}\n</current_file_content>`
			: undefined

		// Count file and folder tokens
		let accTokenCount = 0
		let isOverThreshold = false
		for (const content of [fileContentsPrompts, folderContentsPrompts].filter(Boolean)) {
			const count = await tokenCount(content)
			accTokenCount += count
			if (accTokenCount > this.settings.ragOptions.thresholdTokens) {
				isOverThreshold = true
			}
		}
		if (isOverThreshold) {
			fileContentsPrompts = files.map((file) => {
				return `<file_content path="${file.path}">\n(Content omitted due to token limit. Relevant sections will be provided by semantic search below.)\n</file_content>`
			}).join('\n')
			folderContentsPrompts = folders.map(async (folder) => {
				const tree_content = await getFolderTreeContent(folder)
				return `<folder_content path="${folder.path}">\n${tree_content}\n(Content omitted due to token limit. Relevant sections will be provided by semantic search below.)\n</folder_content>`
			}).join('\n')
		}

		const shouldUseRAG = useVaultSearch || isOverThreshold
		let similaritySearchContents
		if (shouldUseRAG) {
			similaritySearchResults = useVaultSearch
				? await (
					await this.getRagEngine()
				).processQuery({
					query,
					onQueryProgressChange: onQueryProgressChange,
				})
				: await (
					await this.getRagEngine()
				).processQuery({
					query,
					scope: {
						files: files.map((f) => f.path),
						folders: folders.map((f) => f.path),
					},
					onQueryProgressChange: onQueryProgressChange,
				})
			const snippets = similaritySearchResults.map(({ path, content, metadata }) => {
				const contentWithLineNumbers = this.addLineNumbersToContent({
					content,
					startLine: metadata.startLine,
				})
				return `<file_block_content location="${path}#L${metadata.startLine}-${metadata.endLine}">\n${contentWithLineNumbers}\n</file_block_content>`
			}).join('\n')
			similaritySearchContents = snippets.length > 0
				? `<similarity_search_results>\n${snippets}\n</similarity_search_results>`
				: '<similarity_search_results>\n(No relevant results found)\n</similarity_search_results>'
		} else {
			similaritySearchContents = undefined
		}

		const parsedText = [
			taskPrompt,
			blockContentsPrompt,
			fileContentsPrompts,
			folderContentsPrompts,
			urlContentsPrompt,
			similaritySearchContents,
			currentFileContentPrompt,
			environmentDetails,
		].filter(Boolean).join('\n\n')

		// user mention images
		const imageDataUrls = message.mentionables
			.filter((m): m is MentionableImage => m.type === 'image')
			.map(({ data }) => data)

		return {
			promptContent: [
				{
					type: 'text',
					text: parsedText,
				},
				...imageDataUrls.map(
					(data): ContentPart => ({
						type: 'image_url',
						image_url: {
							url: data,
						},
					}),
				)
			],
			similaritySearchResults,
		}
	}

	public async getSystemMessageNew(mode: Mode, filesSearchMethod: string, preferredLanguage: string): Promise<RequestMessage> {
		const mcpHub = await this.getMcpHub?.()
		const prompt = await this.systemPrompt.getSystemPrompt(
			this.app.vault.getRoot().path,
			false,
			mode,
			filesSearchMethod,
			preferredLanguage,
			this.diffStrategy,
			this.customModePrompts,
			this.customModeList,
			mcpHub,
		)

		return {
			role: 'system',
			content: prompt,
		}
	}

	private getSystemMessage(shouldUseRAG: boolean, type?: string): RequestMessage {
		const systemPromptEdit = `You are an expert text editor assistant. Your task is to modify the selected content precisely according to the user's instruction, while preserving the original formatting and ensuring consistency with the surrounding context.

You will receive:
- <task>: The specific editing instruction
- <selected_content>: The text to be modified
- <surrounding_context>: The surrounding file context (may be truncated)

When performing the edit:
- Make only the minimal changes necessary to fulfill the instruction
- Preserve original formatting (indentation, line breaks, spacing) unless the instruction explicitly requires changing it
- Use the context to ensure the edit maintains consistency with the surrounding content
- Match the style, terminology, and conventions of the original document
- Handle special content types appropriately:
  - Code: Maintain syntax correctness and follow existing code style
  - Lists: Preserve formatting and hierarchy
  - Tables: Keep alignment and structure
  - Markdown/formatting: Respect existing markup

Your edit response must be wrapped in <response> tags:
<response>
[modified content here]
</response>
`

		const systemPrompt = `You are an intelligent assistant to help answer any questions that the user has, particularly about editing and organizing markdown files in Obsidian.

1. Please keep your response as concise as possible. Avoid being verbose.

2. When the user is asking for edits to their markdown, please provide a simplified version of the markdown block emphasizing only the changes. Use comments to show where unchanged content has been skipped. Wrap the markdown block with <infio_block> tags. Add filename, language, startLine, endLine and type attributes to the <infio_block> tags. If the user provides line numbers in the file path (e.g. file.md#L10-20), use those line numbers in the startLine and endLine attributes. For example:
<infio_block filename="path/to/file.md" language="markdown" startLine="10" endLine="20" type="edit">
<!-- ... existing content ... -->
{{ edit_1 }}
<!-- ... existing content ... -->
{{ edit_2 }}
<!-- ... existing content ... -->
</infio_block>
The user has full access to the file, so they prefer seeing only the changes in the markdown. Often this will mean that the start/end of the file will be skipped, but that's okay! Rewrite the entire file only if specifically requested. Always provide a brief explanation of the updates, except when the user specifically asks for just the content.

3. Do not lie or make up facts.

4. Respond in the same language as the user's message.

5. Format your response in markdown.

6. When writing out new markdown blocks, also wrap them with <infio_block> tags. For example:
<infio_block language="markdown" type="new">
{{ content }}
</infio_block>

7. When providing markdown blocks for an existing file, add the filename and language attributes to the <infio_block> tags. Restate the relevant section or heading, so the user knows which part of the file you are editing. For example:
<infio_block filename="path/to/file.md" language="markdown" type="reference">
## Section Title
...
{{ content }}
...
</infio_block>`

		const systemPromptRAG = `You are an intelligent assistant to help answer any questions that the user has, particularly about editing and organizing markdown files in Obsidian. You will be given your conversation history with them and potentially relevant blocks of markdown content from the current vault.
      
1. Do not lie or make up facts.

2. Respond in the same language as the user's message.

3. Format your response in markdown.

4. When referencing markdown blocks in your answer, keep the following guidelines in mind:

  a. Never include line numbers in the output markdown.

  b. Wrap the markdown block with <infio_block> tags. Include language attribute and type. For example:
  <infio_block language="markdown" type="new">
  {{ content }}
  </infio_block>

  c. When providing markdown blocks for an existing file, also include the filename attribute to the <infio_block> tags. For example:
  <infio_block filename="path/to/file.md" language="markdown" type="reference">
  {{ content }}
  </infio_block>

  d. When referencing a markdown block the user gives you, add the startLine and endLine attributes to the <infio_block> tags. Write related content outside of the <infio_block> tags. The content inside the <infio_block> tags will be ignored and replaced with the actual content of the markdown block. For example:
  <infio_block filename="path/to/file.md" language="markdown" startLine="2" endLine="30" type="reference"></infio_block>`

		if (type === 'edit') {
			return {
				role: 'system',
				content: systemPromptEdit,
			}
		}

		return {
			role: 'system',
			content: shouldUseRAG ? systemPromptRAG : systemPrompt,
		}
	}

	private getCustomInstructionMessage(): RequestMessage | null {
		const customInstruction = this.settings.systemPrompt.trim()
		if (!customInstruction) {
			return null
		}
		return {
			role: 'user',
			content: `Here are additional instructions to follow in your responses when relevant. There's no need to explicitly acknowledge them:
<custom_instructions>
${customInstruction}
</custom_instructions>`,
		}
	}

	private async getCurrentFileMessage(
		currentFile: TFile,
	): Promise<RequestMessage> {
		const fileContent = await readTFileContent(currentFile, this.app.vault)
		return {
			role: 'user',
			content: `# Inputs
## Current Open File
Here is the file I'm looking at.
\`\`\`${currentFile.path}
${fileContent}
\`\`\`\n\n`,
		}
	}

	private async getContextForEdit(
		currentFile: TFile,
		startLine: number,
		endLine: number
	): Promise<string | null> {
		// 如果选中内容超过500行，则不提供上下文
		if (endLine - startLine + 1 > 500) {
			return null;
		}

		const fileContent = await readTFileContent(currentFile, this.app.vault);
		const lines = fileContent.split('\n');

		// 计算上下文范围，并处理边界情况
		const contextStartLine = Math.max(1, startLine - 20);
		const contextEndLine = Math.min(lines.length, endLine + 20);

		// 提取上下文行
		const contextLines = lines.slice(contextStartLine - 1, contextEndLine);

		// 返回带行号的上下文内容
		return addLineNumbers(contextLines.join('\n'), contextStartLine);
	}

	public async generateEditMessages({
		currentFile,
		selectedContent,
		instruction,
		startLine,
		endLine,
	}: {
		currentFile: TFile
		selectedContent: string
		instruction: string
		startLine: number
		endLine: number
	}): Promise<RequestMessage[]> {
		const systemMessage = this.getSystemMessage(false, 'edit');

		// 获取适当大小的上下文
		const context = await this.getContextForEdit(currentFile, startLine, endLine);

		let userPrompt = `<task>\n${instruction}\n</task>\n\n
<selected_content location="${currentFile.path}#L${startLine}-${endLine}">\n${selectedContent}\n</selected_content>`;

		// 只有当上下文不为null时才添加
		if (context !== null) {
			userPrompt += `\n\n<surrounding_context location="${currentFile.path}">\n${context}\n</surrounding_context>`;
		} else {
			userPrompt += `\n\n<surrounding_context location="${currentFile.path}">\n(No relevant context found)\n</surrounding_context>`;
		}

		const userMessage: RequestMessage = {
			role: 'user',
			content: userPrompt,
		};

		return [systemMessage, userMessage];
	}

	private getRagInstructionMessage(): RequestMessage {
		return {
			role: 'user',
			content: `If you need to reference any of the markdown blocks I gave you, add the startLine and endLine attributes to the <infio_block> tags without any content inside. For example:
<infio_block filename="path/to/file.md" language="markdown" startLine="200" endLine="310" type="reference"></infio_block>

When writing out new markdown blocks, remember not to include "line_number|" at the beginning of each line.`,
		}
	}

	private addLineNumbersToContent({
		content,
		startLine,
	}: {
		content: string
		startLine: number
	}): string {
		const lines = content.split('\n')
		const linesWithNumbers = lines.map((line, index) => {
			return `${startLine + index}|${line}`
		})
		return linesWithNumbers.join('\n')
	}

	/**
	 * TODO: Improve markdown conversion logic
	 * - filter visually hidden elements
	 * ...
	 */
	private async getWebsiteContent(url: string): Promise<string> {
		if (isYoutubeUrl(url)) {
			// TODO: pass language based on user preferences
			const { title, transcript } =
				await YoutubeTranscript.fetchTranscriptAndMetadata(url)

			return `Title: ${title}
Video Transcript:
${transcript.map((t) => `${t.offset}: ${t.text}`).join('\n')}`
		}

		const response = await requestUrl({ url })

		return htmlToMarkdown(response.text)
	}
}
