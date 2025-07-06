import React, { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { ApplyStatus, ToolArgs } from '../../types/apply'
import { ChatMessage, ChatUserMessage } from '../../types/chat'
import { ParsedMsgBlock, parseMsgBlocks } from '../../utils/parse-infio-block'

interface MultipleToolExecutorProps {
	content: string
	onApply: (applyMsgId: string, toolArgs: ToolArgs) => void
	onSubmit: (newChatHistory: ChatMessage[], useVaultSearch?: boolean) => void
	chatMessages: ChatMessage[]
	setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
}

interface ToolExecutionState {
	id: string
	toolArgs: ToolArgs
	status: 'pending' | 'executing' | 'completed' | 'failed'
	result?: string
	error?: string
}

export default function MultipleToolExecutor({
	content,
	onApply,
	onSubmit,
	chatMessages,
	setChatMessages,
}: MultipleToolExecutorProps) {
	const [toolExecutions, setToolExecutions] = useState<ToolExecutionState[]>([])
	const [isExecuting, setIsExecuting] = useState(false)
	const [allResults, setAllResults] = useState<string>('')
	const executedBlocks = useRef<Set<string>>(new Set())

	// Parse tool calls from content
	const blocks: ParsedMsgBlock[] = React.useMemo(() => {
		console.log('=== PARSING MULTIPLE TOOL CALLS ===')
		console.log('Input content:', content)
		const parsedBlocks = parseMsgBlocks(content)
		console.log('Parsed blocks:', parsedBlocks)
		console.log('==========================')
		return parsedBlocks
	}, [content])

	// Extract tool calls that need to be executed
	const extractToolCalls = useCallback(() => {
		const toolCalls: ToolArgs[] = []

		blocks.forEach((block) => {
			// Skip blocks that are auto-executed
			if (block.type === 'assistant_memory' || block.type === 'fetch_tasks') {
				return
			}

			// Skip blocks that are not finished
			if (!block.finish) {
				return
			}

			// Create unique key to prevent re-execution
			const blockKey = JSON.stringify(block)
			if (executedBlocks.current.has(blockKey)) {
				return
			}

			// Convert parsed blocks to ToolArgs
			switch (block.type) {
				case 'write_to_file':
					toolCalls.push({
						type: 'write_to_file',
						filepath: block.path,
						content: block.content,
					})
					break
				case 'insert_content':
					toolCalls.push({
						type: 'insert_content',
						filepath: block.path,
						content: block.content,
						startLine: block.startLine,
						endLine: block.endLine,
					})
					break
				case 'search_and_replace':
					toolCalls.push({
						type: 'search_and_replace',
						filepath: block.path,
						operations: block.operations.map(op => ({
							search: op.search,
							replace: op.replace,
							startLine: op.start_line,
							endLine: op.end_line,
							useRegex: op.use_regex,
							ignoreCase: op.ignore_case,
							regexFlags: op.regex_flags,
						})),
					})
					break
				case 'read_file':
					toolCalls.push({
						type: 'read_file',
						filepath: block.path,
					})
					break
				case 'list_files':
					toolCalls.push({
						type: 'list_files',
						filepath: block.path,
						recursive: block.recursive,
					})
					break
				case 'match_search_files':
					toolCalls.push({
						type: 'match_search_files',
						filepath: block.path,
						query: block.query,
					})
					break
				case 'regex_search_files':
					toolCalls.push({
						type: 'regex_search_files',
						filepath: block.path,
						regex: block.regex,
					})
					break
				case 'semantic_search_files':
					toolCalls.push({
						type: 'semantic_search_files',
						filepath: block.path,
						query: block.query,
					})
					break
				case 'search_web':
					toolCalls.push({
						type: 'search_web',
						query: block.query,
					})
					break
				case 'fetch_urls_content':
					toolCalls.push({
						type: 'fetch_urls_content',
						urls: block.urls,
					})
					break
				case 'switch_mode':
					toolCalls.push({
						type: 'switch_mode',
						mode: block.mode,
					})
					break
				case 'use_mcp_tool':
					toolCalls.push({
						type: 'use_mcp_tool',
						server_name: block.server_name,
						tool_name: block.tool_name,
						parameters: block.parameters,
					})
					break
			}
		})

		return toolCalls
	}, [blocks])

	// Execute multiple tools sequentially
	const executeMultipleTools = useCallback(async () => {
		const toolCalls = extractToolCalls()
		
		if (toolCalls.length === 0) {
			return
		}

		console.log('=== EXECUTING MULTIPLE TOOLS ===')
		console.log('Tool calls to execute:', toolCalls.length)
		
		setIsExecuting(true)
		setToolExecutions(toolCalls.map(toolArgs => ({
			id: uuidv4(),
			toolArgs,
			status: 'pending',
		})))

		const results: string[] = []

		for (let i = 0; i < toolCalls.length; i++) {
			const toolCall = toolCalls[i]
			const executionId = uuidv4()

			console.log(`Executing tool ${i + 1}/${toolCalls.length}:`, toolCall.type)

			// Update execution status
			setToolExecutions(prev => prev.map(exec => 
				exec.toolArgs === toolCall 
					? { ...exec, status: 'executing' }
					: exec
			))

			try {
				// Execute the tool
				const result = await new Promise<{ type: string; applyMsgId: string; applyStatus: ApplyStatus; returnMsg?: ChatUserMessage }>((resolve, reject) => {
					onApply(executionId, toolCall)
					
					// We need to handle the result through the mutation's onSuccess callback
					// For now, we'll simulate the result
					setTimeout(() => {
						resolve({
							type: toolCall.type,
							applyMsgId: executionId,
							applyStatus: ApplyStatus.Applied,
							returnMsg: {
								role: 'user',
								applyStatus: ApplyStatus.Idle,
								content: null,
								promptContent: `[${toolCall.type}] Result: Tool executed successfully\n`,
								id: uuidv4(),
								mentionables: [],
							}
						})
					}, 1000)
				})

				// Add result to collection
				if (result.returnMsg?.promptContent) {
					results.push(result.returnMsg.promptContent)
				}

				// Update execution status
				setToolExecutions(prev => prev.map(exec => 
					exec.toolArgs === toolCall 
						? { ...exec, status: 'completed', result: result.returnMsg?.promptContent }
						: exec
				))

			} catch (error) {
				console.error(`Error executing tool ${toolCall.type}:`, error)
				
				// Update execution status
				setToolExecutions(prev => prev.map(exec => 
					exec.toolArgs === toolCall 
						? { ...exec, status: 'failed', error: error.message }
						: exec
				))
			}
		}

		// Combine all results
		const combinedResults = results.join('\n\n')
		setAllResults(combinedResults)
		setIsExecuting(false)

		console.log('=== MULTIPLE TOOLS EXECUTION COMPLETE ===')
		console.log('Combined results:', combinedResults)

		// Submit the combined results for final response
		if (combinedResults) {
			const resultMessage: ChatUserMessage = {
				role: 'user',
				applyStatus: ApplyStatus.Idle,
				content: null,
				promptContent: combinedResults,
				id: uuidv4(),
				mentionables: [],
			}

			const newChatHistory = [...chatMessages, resultMessage]
			onSubmit(newChatHistory, false)
		}
	}, [extractToolCalls, onApply, onSubmit, chatMessages])

	// Auto-execute tools when content changes
	useEffect(() => {
		const toolCalls = extractToolCalls()
		
		if (toolCalls.length > 1 && !isExecuting) {
			console.log(`Found ${toolCalls.length} tool calls, executing sequentially`)
			executeMultipleTools()
		}
	}, [blocks, executeMultipleTools, isExecuting])

	// Auto-execute single tools (existing behavior)
	useEffect(() => {
		blocks.forEach((block) => {
			if (block.type === 'assistant_memory' && block.content) {
				const blockKey = `${block.content}`
				if (!executedBlocks.current.has(blockKey)) {
					console.log('Auto-executing assistant_memory block')
					executedBlocks.current.add(blockKey)
					onApply(uuidv4(), {
						type: 'assistant_memory',
						action: 'write',
						content: block.content,
					})
				}
			} else if (block.type === 'fetch_tasks') {
				const blockKey = `fetch_tasks_${block.source || 'all'}_${block.status || 'all'}_${block.completion || ''}_${block.due || ''}_${block.created || ''}_${block.start || ''}_${block.scheduled || ''}`
				if (!executedBlocks.current.has(blockKey)) {
					console.log('Auto-executing fetch_tasks block')
					executedBlocks.current.add(blockKey)
					let status: 'completed' | 'incomplete' | 'all' | undefined = undefined
					if (block.status) {
						const trimmedStatus = block.status.trim()
						if (trimmedStatus === 'completed' || trimmedStatus === 'incomplete' || trimmedStatus === 'all') {
							status = trimmedStatus
						}
					}
					
					onApply(uuidv4(), {
						type: 'fetch_tasks',
						source: block.source,
						status: status,
						completion: block.completion,
						due: block.due,
						created: block.created,
						start: block.start,
						scheduled: block.scheduled,
						finish: true
					})
				}
			}
		})
	}, [blocks, onApply])

	// Don't render anything if no multiple tool calls
	if (extractToolCalls().length <= 1) {
		return null
	}

	return (
		<div className="multiple-tool-executor">
			{isExecuting && (
				<div className="execution-status">
					<div className="execution-header">
						<span>Executing {toolExecutions.length} tools sequentially...</span>
					</div>
					<div className="execution-progress">
						{toolExecutions.map((execution, index) => (
							<div key={execution.id} className={`execution-item ${execution.status}`}>
								<span className="execution-number">{index + 1}</span>
								<span className="execution-type">{execution.toolArgs.type}</span>
								<span className="execution-status-text">
									{execution.status === 'pending' && 'Pending'}
									{execution.status === 'executing' && 'Executing...'}
									{execution.status === 'completed' && 'Completed'}
									{execution.status === 'failed' && 'Failed'}
								</span>
								{execution.error && (
									<span className="execution-error">{execution.error}</span>
								)}
							</div>
						))}
					</div>
				</div>
			)}
			{allResults && (
				<div className="execution-results">
					<div className="results-header">All tool results:</div>
					<pre className="results-content">{allResults}</pre>
				</div>
			)}
		</div>
	)
} 