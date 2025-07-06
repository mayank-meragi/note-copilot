// @ts-nocheck
import JSON5 from 'json5'
import { parseFragment } from 'parse5'

export type ParsedMsgBlock =
	| {
		type: 'string'
		content: string
	}
	| {
		type: 'think'
		content: string
	} | {
		type: 'thinking'
		content: string
	} | {
		type: 'write_to_file'
		path: string
		content: string
		lineCount?: number
	} | {
		type: 'insert_content'
		path: string
		startLine: number
		content: string
	} | {
		type: 'read_file'
		path: string
		finish: boolean
	} | {
		type: 'attempt_completion'
		result: string
		finish: boolean
	} | {
		type: 'search_and_replace'
		path: string
		content: string
		operations: {
			search: string
			replace: string
			start_line?: number
			end_line?: number
			use_regex?: boolean
			ignore_case?: boolean
			regex_flags?: string
		}[]
		finish: boolean
	} | {
		type: 'apply_diff'
		path: string
		diff: string
		finish: boolean
	} | {
		type: 'ask_followup_question'
		question: string,
		finish: boolean
	} | {
		type: 'list_files'
		path: string
		recursive?: boolean
		finish: boolean
	} | {
		type: 'match_search_files'
		path: string
		query: string
		finish: boolean
	} | {
		type: 'regex_search_files'
		path: string
		regex: string
		finish: boolean
	} | {
		type: 'semantic_search_files'
		path: string
		query: string
		finish: boolean
	} | {
		type: 'search_web'
		query: string
		finish: boolean
	} | {
		type: 'fetch_urls_content'
		urls: string[]
		finish: boolean
	} | {
		type: 'switch_mode'
		mode: string
		reason: string
		finish: boolean
	} | {
		type: 'use_mcp_tool'
		server_name: string
		tool_name: string
		parameters: Record<string, unknown>,
		finish: boolean
	} | {
		type: 'assistant_memory'
		action: string
		content?: string
		finish: boolean
	} | {
		type: 'tool_result'
		content: string
	}

export function parseMsgBlocks(
	input: string,
): ParsedMsgBlock[] {
	try {
		const parsedResult: ParsedMsgBlock[] = []
		const fragment = parseFragment(input, {
			sourceCodeLocationInfo: true,
		})
		let lastEndOffset = 0
		for (const node of fragment.childNodes) {
			if (node.nodeName === 'thinking') {
				if (!node.sourceCodeLocation) {
					throw new Error('sourceCodeLocation is undefined')
				}
				const startOffset = node.sourceCodeLocation.startOffset
				const endOffset = node.sourceCodeLocation.endOffset
				if (startOffset > lastEndOffset) {
					parsedResult.push({
						type: 'string',
						content: input.slice(lastEndOffset, startOffset),
					})
				}

				const children = node.childNodes
				if (children.length === 0) {
					parsedResult.push({
						type: 'thinking',
						content: '',
					})
				} else {
					const innerContentStartOffset =
						children[0].sourceCodeLocation?.startOffset
					const innerContentEndOffset =
						children[children.length - 1].sourceCodeLocation?.endOffset
					if (!innerContentStartOffset || !innerContentEndOffset) {
						throw new Error('sourceCodeLocation is undefined')
					}
					parsedResult.push({
						type: 'thinking',
						content: input.slice(innerContentStartOffset, innerContentEndOffset),
					})
				}
				lastEndOffset = endOffset
			} else if (node.nodeName === 'think') {
				if (!node.sourceCodeLocation) {
					throw new Error('sourceCodeLocation is undefined')
				}
				const startOffset = node.sourceCodeLocation.startOffset
				const endOffset = node.sourceCodeLocation.endOffset
				if (startOffset > lastEndOffset) {
					parsedResult.push({
						type: 'string',
						content: input.slice(lastEndOffset, startOffset),
					})
				}

				const children = node.childNodes
				if (children.length === 0) {
					parsedResult.push({
						type: 'think',
						content: '',
					})
				} else {
					const innerContentStartOffset =
						children[0].sourceCodeLocation?.startOffset
					const innerContentEndOffset =
						children[children.length - 1].sourceCodeLocation?.endOffset
					if (!innerContentStartOffset || !innerContentEndOffset) {
						throw new Error('sourceCodeLocation is undefined')
					}
					parsedResult.push({
						type: 'think',
						content: input.slice(innerContentStartOffset, innerContentEndOffset),
					})
				}
				lastEndOffset = endOffset
			} else if (node.nodeName === 'list_files') {
				if (!node.sourceCodeLocation) {
					throw new Error('sourceCodeLocation is undefined')
				}
				const startOffset = node.sourceCodeLocation.startOffset
				const endOffset = node.sourceCodeLocation.endOffset
				if (startOffset > lastEndOffset) {
					parsedResult.push({
						type: 'string',
						content: input.slice(lastEndOffset, startOffset),
					})
				}
				let path: string | undefined
				let recursive: boolean | undefined

				for (const childNode of node.childNodes) {
					if (childNode.nodeName === 'path' && childNode.childNodes.length > 0) {
						path = childNode.childNodes[0].value
					} else if (childNode.nodeName === 'recursive' && childNode.childNodes.length > 0) {
						const recursiveValue = childNode.childNodes[0].value
						recursive = recursiveValue ? recursiveValue.toLowerCase() === 'true' : false
					}
				}

				parsedResult.push({
					type: 'list_files',
					path: path || '/',
					recursive,
					finish: node.sourceCodeLocation.endTag !== undefined
				})
				lastEndOffset = endOffset
			} else if (node.nodeName === 'read_file') {
				if (!node.sourceCodeLocation) {
					throw new Error('sourceCodeLocation is undefined')
				}
				const startOffset = node.sourceCodeLocation.startOffset
				const endOffset = node.sourceCodeLocation.endOffset
				if (startOffset > lastEndOffset) {
					parsedResult.push({
						type: 'string',
						content: input.slice(lastEndOffset, startOffset),
					})
				}
				let path: string | undefined
				for (const childNode of node.childNodes) {
					if (childNode.nodeName === 'path' && childNode.childNodes.length > 0) {
						path = childNode.childNodes[0].value
					}
				}
				parsedResult.push({
					type: 'read_file',
					path,
					// Check if the tag is completely parsed with proper closing tag
					// In parse5, when a tag is properly closed, its sourceCodeLocation will include endTag
					finish: node.sourceCodeLocation.endTag !== undefined
				})
				lastEndOffset = endOffset
			} else if (node.nodeName === 'match_search_files') {
				if (!node.sourceCodeLocation) {
					throw new Error('sourceCodeLocation is undefined')
				}
				const startOffset = node.sourceCodeLocation.startOffset
				const endOffset = node.sourceCodeLocation.endOffset
				if (startOffset > lastEndOffset) {
					parsedResult.push({
						type: 'string',
						content: input.slice(lastEndOffset, startOffset),
					})
				}
				let path: string | undefined
				let query: string | undefined

				for (const childNode of node.childNodes) {
					if (childNode.nodeName === 'path' && childNode.childNodes.length > 0) {
						path = childNode.childNodes[0].value
					} else if (childNode.nodeName === 'query' && childNode.childNodes.length > 0) {
						query = childNode.childNodes[0].value
					}
				}

				parsedResult.push({
					type: 'match_search_files',
					path: path,
					query: query,
					finish: node.sourceCodeLocation.endTag !== undefined
				})
				lastEndOffset = endOffset
			} else if (node.nodeName === 'regex_search_files') {
				if (!node.sourceCodeLocation) {
					throw new Error('sourceCodeLocation is undefined')
				}
				const startOffset = node.sourceCodeLocation.startOffset
				const endOffset = node.sourceCodeLocation.endOffset
				if (startOffset > lastEndOffset) {
					parsedResult.push({
						type: 'string',
						content: input.slice(lastEndOffset, startOffset),
					})
				}
				let path: string | undefined
				let regex: string | undefined

				for (const childNode of node.childNodes) {
					if (childNode.nodeName === 'path' && childNode.childNodes.length > 0) {
						path = childNode.childNodes[0].value
					} else if (childNode.nodeName === 'regex' && childNode.childNodes.length > 0) {
						regex = childNode.childNodes[0].value
					}
				}

				parsedResult.push({
					type: 'regex_search_files',
					path: path,
					regex: regex,
					finish: node.sourceCodeLocation.endTag !== undefined
				})
				lastEndOffset = endOffset
			} else if (node.nodeName === 'semantic_search_files') {
				if (!node.sourceCodeLocation) {
					throw new Error('sourceCodeLocation is undefined')
				}
				const startOffset = node.sourceCodeLocation.startOffset
				const endOffset = node.sourceCodeLocation.endOffset
				if (startOffset > lastEndOffset) {
					parsedResult.push({
						type: 'string',
						content: input.slice(lastEndOffset, startOffset),
					})
				}
				let path: string | undefined
				let query: string | undefined

				for (const childNode of node.childNodes) {
					if (childNode.nodeName === 'path' && childNode.childNodes.length > 0) {
						path = childNode.childNodes[0].value
					} else if (childNode.nodeName === 'query' && childNode.childNodes.length > 0) {
						query = childNode.childNodes[0].value
					}
				}

				parsedResult.push({
					type: 'semantic_search_files',
					path: path,
					query: query,
					finish: node.sourceCodeLocation.endTag !== undefined
				})
				lastEndOffset = endOffset
			} else if (node.nodeName === 'write_to_file') {
				if (!node.sourceCodeLocation) {
					throw new Error('sourceCodeLocation is undefined')
				}
				const startOffset = node.sourceCodeLocation.startOffset
				const endOffset = node.sourceCodeLocation.endOffset
				if (startOffset > lastEndOffset) {
					parsedResult.push({
						type: 'string',
						content: input.slice(lastEndOffset, startOffset),
					})
				}
				let path: string | undefined
				let content: string = ''
				let lineCount: number | undefined
				// 处理子标签
				for (const childNode of node.childNodes) {
					if (childNode.nodeName === 'path' && childNode.childNodes.length > 0) {
						path = childNode.childNodes[0].value
					} else if (childNode.nodeName === 'content' && childNode.childNodes.length > 0) {
						// 如果内容有多个子节点，需要合并它们
						content = childNode.childNodes.map(n => n.value || '').join('')
					} else if (childNode.nodeName === 'line_count' && childNode.childNodes.length > 0) {
						const lineCountStr = childNode.childNodes[0].value
						lineCount = lineCountStr ? parseInt(lineCountStr) : undefined
					}
				}
				parsedResult.push({
					type: 'write_to_file',
					content,
					path,
					lineCount
				})
				lastEndOffset = endOffset

			} else if (node.nodeName === 'insert_content') {
				if (!node.sourceCodeLocation) {
					throw new Error('sourceCodeLocation is undefined')
				}
				const startOffset = node.sourceCodeLocation.startOffset
				const endOffset = node.sourceCodeLocation.endOffset
				if (startOffset > lastEndOffset) {
					parsedResult.push({
						type: 'string',
						content: input.slice(lastEndOffset, startOffset),
					})
				}
				let path: string | undefined
				let content: string = ''
				let startLine: number = 0

				// 处理子标签
				for (const childNode of node.childNodes) {
					if (childNode.nodeName === 'path' && childNode.childNodes.length > 0) {
						path = childNode.childNodes[0].value
					} else if (childNode.nodeName === 'operations' && childNode.childNodes.length > 0) {
						try {
							const operationsJson = childNode.childNodes[0].value
							const operations = JSON5.parse(operationsJson)
							if (Array.isArray(operations) && operations.length > 0) {
								const operation = operations[0]
								startLine = operation.start_line || 1
								content = operation.content || ''
							}
						} catch (error) {
							console.error('Failed to parse operations JSON', error)
						}
					}
				}

				parsedResult.push({
					type: 'insert_content',
					path,
					startLine,
					content
				})
				lastEndOffset = endOffset
			} else if (node.nodeName === 'search_and_replace') {
				if (!node.sourceCodeLocation) {
					throw new Error('sourceCodeLocation is undefined')
				}
				const startOffset = node.sourceCodeLocation.startOffset
				const endOffset = node.sourceCodeLocation.endOffset
				if (startOffset > lastEndOffset) {
					parsedResult.push({
						type: 'string',
						content: input.slice(lastEndOffset, startOffset),
					})
				}
				let path: string | undefined
				let operations = []
				let content: string = ''

				// 处理子标签
				for (const childNode of node.childNodes) {
					if (childNode.nodeName === 'path' && childNode.childNodes.length > 0) {
						path = childNode.childNodes[0].value
					} else if (childNode.nodeName === 'operations' && childNode.childNodes.length > 0) {
						try {
							// @ts-ignore
							content = childNode.childNodes[0].value
							operations = JSON5.parse(content)
						} catch (error) {
							console.error('Failed to parse operations JSON', error)
						}
					}
				}

				parsedResult.push({
					type: 'search_and_replace',
					path,
					content,
					operations,
					finish: node.sourceCodeLocation.endTag !== undefined
				})
				lastEndOffset = endOffset
			} else if (node.nodeName === 'apply_diff') {
				if (!node.sourceCodeLocation) {
					throw new Error('sourceCodeLocation is undefined')
				}
				const startOffset = node.sourceCodeLocation.startOffset
				const endOffset = node.sourceCodeLocation.endOffset
				if (startOffset > lastEndOffset) {
					parsedResult.push({
						type: 'string',
						content: input.slice(lastEndOffset, startOffset),
					})
				}
				let path: string | undefined
				let diff: string | undefined

				for (const childNode of node.childNodes) {
					if (childNode.nodeName === 'path' && childNode.childNodes.length > 0) {
						// @ts-ignore
						path = childNode.childNodes[0].value
					} else if (childNode.nodeName === 'diff' && childNode.childNodes.length > 0) {
						// @ts-ignore
						diff = childNode.childNodes[0].value
					}
				}

				parsedResult.push({
					type: 'apply_diff',
					path,
					diff,
					finish: node.sourceCodeLocation.endTag !== undefined
				})
				lastEndOffset = endOffset
			} else if (node.nodeName === 'attempt_completion') {
				if (!node.sourceCodeLocation) {
					throw new Error('sourceCodeLocation is undefined')
				}
				const startOffset = node.sourceCodeLocation.startOffset
				const endOffset = node.sourceCodeLocation.endOffset
				if (startOffset > lastEndOffset) {
					parsedResult.push({
						type: 'string',
						content: input.slice(lastEndOffset, startOffset),
					})
				}
				let result: string | undefined
				for (const childNode of node.childNodes) {
					if (childNode.nodeName === 'result' && childNode.childNodes.length > 0) {
						// @ts-ignore
						result = childNode.childNodes[0].value
					}
				}
				parsedResult.push({
					type: 'attempt_completion',
					result,
					finish: node.sourceCodeLocation.endTag !== undefined
				})
				lastEndOffset = endOffset
			} else if (node.nodeName === 'ask_followup_question') {
				if (!node.sourceCodeLocation) {
					throw new Error('sourceCodeLocation is undefined')
				}
				const startOffset = node.sourceCodeLocation.startOffset
				const endOffset = node.sourceCodeLocation.endOffset
				if (startOffset > lastEndOffset) {
					parsedResult.push({
						type: 'string',
						content: input.slice(lastEndOffset, startOffset),
					})
				}
				let question: string | undefined
				for (const childNode of node.childNodes) {
					if (childNode.nodeName === 'question' && childNode.childNodes.length > 0) {
						// @ts-ignore
						question = childNode.childNodes[0].value
					}
				}
				parsedResult.push({
					type: 'ask_followup_question',
					question,
					finish: node.sourceCodeLocation.endTag !== undefined
				})
				lastEndOffset = endOffset
			} else if (node.nodeName === 'switch_mode') {
				if (!node.sourceCodeLocation) {
					throw new Error('sourceCodeLocation is undefined')
				}
				const startOffset = node.sourceCodeLocation.startOffset
				const endOffset = node.sourceCodeLocation.endOffset
				if (startOffset > lastEndOffset) {
					parsedResult.push({
						type: 'string',
						content: input.slice(lastEndOffset, startOffset),
					})
				}

				let mode: string = ''
				let reason: string = ''

				for (const childNode of node.childNodes) {
					if (childNode.nodeName === 'mode_slug' && childNode.childNodes.length > 0) {
						// @ts-ignore - 忽略 value 属性的类型错误
						mode = childNode.childNodes[0].value
					} else if (childNode.nodeName === 'reason' && childNode.childNodes.length > 0) {
						// @ts-ignore - 忽略 value 属性的类型错误
						reason = childNode.childNodes[0].value
					}
				}

				parsedResult.push({
					type: 'switch_mode',
					mode,
					reason,
					finish: node.sourceCodeLocation.endTag !== undefined
				})
				lastEndOffset = endOffset
			} else if (node.nodeName === 'search_web') {
				if (!node.sourceCodeLocation) {
					throw new Error('sourceCodeLocation is undefined')
				}
				const startOffset = node.sourceCodeLocation.startOffset
				const endOffset = node.sourceCodeLocation.endOffset
				if (startOffset > lastEndOffset) {
					parsedResult.push({
						type: 'string',
						content: input.slice(lastEndOffset, startOffset),
					})
				}
				let query: string | undefined
				for (const childNode of node.childNodes) {
					if (childNode.nodeName === 'query' && childNode.childNodes.length > 0) {
						// @ts-ignore
						query = childNode.childNodes[0].value
					}
				}
				parsedResult.push({
					type: 'search_web',
					query: query || '',
					finish: node.sourceCodeLocation.endTag !== undefined
				})
				lastEndOffset = endOffset
			} else if (node.nodeName === 'fetch_urls_content') {
				if (!node.sourceCodeLocation) {
					throw new Error('sourceCodeLocation is undefined')
				}
				const startOffset = node.sourceCodeLocation.startOffset
				const endOffset = node.sourceCodeLocation.endOffset
				if (startOffset > lastEndOffset) {
					parsedResult.push({
						type: 'string',
						content: input.slice(lastEndOffset, startOffset),
					})
				}

				let urls: string[] = []

				for (const childNode of node.childNodes) {
					if (childNode.nodeName === 'urls' && childNode.childNodes.length > 0) {
						try {
							// @ts-ignore
							const urlsJson = childNode.childNodes[0].value
							const parsedUrls = JSON5.parse(urlsJson)
							if (Array.isArray(parsedUrls)) {
								urls = parsedUrls
							}
						} catch (error) {
							// console.error('Failed to parse URLs JSON', error)
						}
					}
				}

				parsedResult.push({
					type: 'fetch_urls_content',
					urls,
					finish: node.sourceCodeLocation.endTag !== undefined
				})
				lastEndOffset = endOffset
			} else if (node.nodeName === 'use_mcp_tool') {
				if (!node.sourceCodeLocation) {
					throw new Error('sourceCodeLocation is undefined')
				}
				const startOffset = node.sourceCodeLocation.startOffset
				const endOffset = node.sourceCodeLocation.endOffset
				if (startOffset > lastEndOffset) {
					parsedResult.push({
						type: 'string',
						content: input.slice(lastEndOffset, startOffset),
					})
				}

				let server_name: string = ''
				let tool_name: string = ''
				let parameters: Record<string, unknown> = {}

				for (const childNode of node.childNodes) {
					if (childNode.nodeName === 'server_name' && childNode.childNodes.length > 0) {
						// @ts-expect-error - 忽略 value 属性的类型错误
						server_name = childNode.childNodes[0].value
					} else if (childNode.nodeName === 'tool_name' && childNode.childNodes.length > 0) {
						// @ts-expect-error - 忽略 value 属性的类型错误
						tool_name = childNode.childNodes[0].value
					} else if ((childNode.nodeName === 'parameters'
						|| childNode.nodeName === 'input'
						|| childNode.nodeName === 'arguments')
						&& childNode.childNodes.length > 0) {
						try {
							// @ts-expect-error - 忽略 value 属性的类型错误
							const parametersJson = childNode.childNodes[0].value
							parameters = JSON5.parse(parametersJson)
						} catch (error) {
							console.debug('Failed to parse parameters JSON', error)
						}
					}
				}

				parsedResult.push({
					type: 'use_mcp_tool',
					server_name,
					tool_name,
					parameters,
					finish: node.sourceCodeLocation.endTag !== undefined
				})	
				lastEndOffset = endOffset
			} else if (node.nodeName === 'assistant_memory') {
				console.log('=== PARSING ASSISTANT_MEMORY ===')
				console.log('Node:', node)
				console.log('Child nodes:', node.childNodes)
				
				if (!node.sourceCodeLocation) {
					throw new Error('sourceCodeLocation is undefined')
				}
				const startOffset = node.sourceCodeLocation.startOffset
				const endOffset = node.sourceCodeLocation.endOffset
				if (startOffset > lastEndOffset) {
					parsedResult.push({
						type: 'string',
						content: input.slice(lastEndOffset, startOffset),
					})
				}

				let content: string = ''

				for (const childNode of node.childNodes) {
					console.log('Processing child node:', childNode.nodeName, childNode.childNodes?.[0]?.value)
					if (childNode.nodeName === 'content' && childNode.childNodes && childNode.childNodes.length > 0) {
						// @ts-ignore
						content = childNode.childNodes[0].value
					}
				}

				console.log('Parsed content:', content)

				// Always accept assistant_memory blocks (no action parameter needed)
				if (content) {
					console.log('Adding assistant_memory block to parsed result')
					parsedResult.push({
						type: 'assistant_memory',
						action: 'write', // Default to write action
						content: content,
						finish: node.sourceCodeLocation.endTag !== undefined
					})
				} else {
					console.log('No content found, skipping assistant_memory block')
				}
				lastEndOffset = endOffset
			} else if (node.nodeName === 'tool_result') {
				if (!node.sourceCodeLocation) {
					throw new Error('sourceCodeLocation is undefined')
				}
				const startOffset = node.sourceCodeLocation.startOffset
				const endOffset = node.sourceCodeLocation.endOffset
				if (startOffset > lastEndOffset) {
					parsedResult.push({
						type: 'string',
						content: input.slice(lastEndOffset, startOffset),
					})
				}

				const children = node.childNodes
				if (children.length === 0) {
					parsedResult.push({
						type: 'tool_result',
						content: '',
					})
				} else {
					const innerContentStartOffset =
						children[0].sourceCodeLocation?.startOffset
					const innerContentEndOffset =
						children[children.length - 1].sourceCodeLocation?.endOffset
					if (!innerContentStartOffset || !innerContentEndOffset) {
						throw new Error('sourceCodeLocation is undefined')
					}
					parsedResult.push({
						type: 'tool_result',
						content: input.slice(innerContentStartOffset, innerContentEndOffset),
					})
				}
				lastEndOffset = endOffset
			}
		}

		// handle the last part of the input
		if (lastEndOffset < input.length) {
			parsedResult.push({
				type: 'string',
				content: input.slice(lastEndOffset),
			})
		}
		return parsedResult
	} catch (error) {
		console.error('Failed to parse infio block', error)
		console.error('Input that caused error:', input)
		// Return a simple string block instead of throwing
		return [{
			type: 'string',
			content: input
		}]
	}
}
