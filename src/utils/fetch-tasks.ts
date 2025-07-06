import { App } from 'obsidian'

export interface Task {
	path: string
	text: string
	completed: boolean
	line?: number
	[key: string]: unknown
}

export interface TaskFilter {
	status?: 'completed' | 'incomplete' | 'all'
	completion?: string // Date string in YYYY-MM-DD format
	due?: string // Date string in YYYY-MM-DD format
	created?: string // Date string in YYYY-MM-DD format
	start?: string // Date string in YYYY-MM-DD format
	scheduled?: string // Date string in YYYY-MM-DD format
	[key: string]: unknown
}

export interface FetchTasksResult {
	tasks: Task[]
	taskCount: number
	completedCount: number
	incompleteCount: number
	formattedTasks: string
	sourceInfo: string
	filterInfo: string
}

interface DataviewQueryResult {
	successful: boolean
	value?: {
		type: string
		values?: Task[]
	}
}

interface DataviewApi {
	query: (query: string) => Promise<DataviewQueryResult>
}

interface DataviewPlugin {
	api: DataviewApi
}

interface AppWithPlugins extends App {
	plugins: {
		plugins: {
			dataview?: DataviewPlugin
		}
	}
}

/**
 * Converts human-readable date expressions to Dataview date expressions
 * @param dateValue - Human-readable date expression
 * @returns string - Dataview date expression
 */
function convertDateExpression(dateValue: string): string {
	const normalized = dateValue.toLowerCase().trim()
	
	// If it's already a proper date format (YYYY-MM-DD), return as is
	if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
		return `date("${normalized}")`
	}
	
	// If it's a relative date expression that Dataview understands, pass through
	if (normalized.includes('ago') || normalized.includes('from now') || 
		normalized.includes('days') || normalized.includes('weeks') || 
		normalized.includes('months') || normalized.includes('years')) {
		return `date(${normalized})`
	}
	
	// Default: treat as literal date string
	return `date("${dateValue}")`
}

/**
 * Intelligently parses and converts filter values to proper Dataview format
 * @param filterKey - The filter key (status, due, completion, etc.)
 * @param filterValue - The raw filter value
 * @returns string - The converted Dataview expression
 */
function convertFilterValue(filterKey: string, filterValue: string): string {
	const normalizedValue = filterValue.toLowerCase().trim()
	
	// Handle status values
	if (filterKey === 'status') {
		if (normalizedValue === 'done' || normalizedValue === 'finished' || normalizedValue === 'complete') {
			return 'completed'
		}
		if (normalizedValue === 'todo' || normalizedValue === 'pending' || normalizedValue === 'open' || normalizedValue === 'incomplete') {
			return 'incomplete'
		}
		return normalizedValue // Return as is for 'all', 'completed', 'incomplete'
	}
	
	// Handle date-based filters - just convert basic date formats
	if (['due', 'completion', 'created', 'start', 'scheduled'].includes(filterKey)) {
		return convertDateExpression(normalizedValue)
	}
	
	// Handle boolean values
	if (normalizedValue === 'true' || normalizedValue === 'yes' || normalizedValue === '1') {
		return 'true'
	}
	if (normalizedValue === 'false' || normalizedValue === 'no' || normalizedValue === '0') {
		return 'false'
	}
	
	// Default: return as string literal
	return `"${filterValue}"`
}

/**
 * Intelligently processes and validates task filters
 * @param rawFilters - Raw filter object from user input
 * @returns TaskFilter - Processed and validated filters
 */
function processFilters(rawFilters: Record<string, unknown>): TaskFilter {
	const processed: TaskFilter = {}
	
	if (!rawFilters || typeof rawFilters !== 'object') {
		return processed
	}
	
	for (const [key, value] of Object.entries(rawFilters)) {
		if (value === undefined || value === null || value === '') {
			continue
		}
		
		const stringValue = String(value).trim()
		if (!stringValue) {
			continue
		}
		
		// Process the filter value
		const processedValue = convertFilterValue(key, stringValue)
		
		// Add to processed filters
		if (['status', 'completion', 'due', 'created', 'start', 'scheduled'].includes(key)) {
			processed[key as keyof TaskFilter] = processedValue as TaskFilter[keyof TaskFilter]
		} else {
			// For custom fields, store as string
			processed[key] = processedValue
		}
	}
	
	return processed
}

/**
 * Builds a Dataview query string from source and filters
 * @param source - Optional source string
 * @param filters - Processed filters
 * @returns string - Complete Dataview query
 */
function buildDataviewQuery(source?: string, filters?: TaskFilter): string {
	let query = 'TASK'
	
	// Add source filtering
	if (source && source.trim()) {
		query += ` FROM ${source.trim()}`
	}
	
	// Add WHERE clause for filters
	const whereConditions: string[] = []
	
	// Always filter for tasks with the "task" tag
	whereConditions.push('contains(tags, "#task")')
	
	if (filters) {
		// Filter by status
		if (filters.status && filters.status !== 'all') {
			if (filters.status === 'completed') {
				whereConditions.push('completed')
			} else if (filters.status === 'incomplete') {
				whereConditions.push('!completed')
				whereConditions.push('!checked')
			}
		}
		
		// Handle all date-based filters generically
		const dateFields = ['completion', 'due', 'created', 'start', 'scheduled']
		for (const field of dateFields) {
			if (filters[field as keyof TaskFilter]) {
				const value = filters[field as keyof TaskFilter] as string
				whereConditions.push(`${field} = ${value}`)
			}
		}
		
		// Handle custom fields (any field not in the predefined list)
		for (const [key, value] of Object.entries(filters)) {
			if (!['status', 'completion', 'due', 'created', 'start', 'scheduled'].includes(key)) {
				whereConditions.push(`${key} = ${value}`)
			}
		}
	}
	
	// Add WHERE clause if we have conditions
	if (whereConditions.length > 0) {
		query += ` WHERE ${whereConditions.join(' AND ')}`
	}
	
	return query
}

/**
 * Fetches tasks from the Obsidian vault using the Dataview plugin API
 * @param app - The Obsidian app instance
 * @param source - Optional Dataview source string to filter tasks
 * @param filters - Optional filters to apply to the tasks (can be raw/unprocessed)
 * @returns Promise<FetchTasksResult> - The fetched tasks and metadata
 */
export async function fetchTasksFromVault(
	app: App, 
	source?: string, 
	rawFilters?: Record<string, unknown>
): Promise<FetchTasksResult> {
	console.log('=== FETCH TASKS UTILITY ===')
	console.log('App:', app)
	console.log('Source parameter:', source)
	console.log('Raw filters parameter:', rawFilters)
	
	// Intelligently process filters
	const filters = processFilters(rawFilters || {})
	console.log('Processed filters:', filters)
	
	// Access the Dataview plugin API
	console.log('Attempting to access Dataview plugin...')
	const appWithPlugins = app as AppWithPlugins
	const dataviewPlugin = appWithPlugins.plugins?.plugins?.dataview
	console.log('Dataview plugin found:', !!dataviewPlugin)
	
	if (!dataviewPlugin || !dataviewPlugin.api) {
		console.error('Dataview plugin not found or API not available')
		throw new Error('Dataview plugin not found or API not available')
	}

	const dataviewApi = dataviewPlugin.api
	console.log('Dataview API available:', !!dataviewApi)
	
	// Build the Dataview query
	const query = buildDataviewQuery(source, filters)
	console.log('Generated Dataview query:', query)
	
	// Execute the query using Dataview's query API
	let tasks: Task[] = []
	
	try {
		console.log('Executing Dataview query...')
		
		if (!dataviewApi.query || typeof dataviewApi.query !== 'function') {
			throw new Error('Dataview query API not available')
		}
		
		const result = await dataviewApi.query(query)
		console.log('Query result:', result)
		
		if (result.successful && result.value && result.value.type === 'task') {
			tasks = result.value.values || []
			console.log('Tasks from query result:', tasks.length)
		} else {
			throw new Error(`Query failed or returned non-task result: ${JSON.stringify(result)}`)
		}
		
		console.log('Final tasks count:', tasks.length)
		
		// Log task details
		console.log('Task breakdown:')
		tasks.forEach((task, index) => {
			console.log(`Task ${index + 1}:`, task)
		})
		
	} catch (error) {
		console.error('Error executing Dataview query:', error)
		throw new Error(`Failed to fetch tasks: ${error instanceof Error ? error.message : String(error)}`)
	}
	
	// Calculate statistics
	const taskCount = tasks.length
	const completedCount = tasks.filter(t => t.completed).length
	const incompleteCount = tasks.filter(t => !t.completed).length
	
	// Format the tasks for display
	console.log('Formatting tasks for display...')
	const formattedTasks = tasks.map(task => {
		const file = task.path
		const taskText = task.text
		const completed = task.completed
		const status = completed ? '✅' : '⬜'
		const formatted = `${status} [[${file}]] - ${taskText}`
		console.log('Formatted task:', formatted)
		return formatted
	}).join('\n')
	
	const sourceInfo = source ? ` from source: "${source}"` : ' from all files'
	
	// Build filter info string
	const filterInfo = filters ? Object.entries(filters)
		.filter(([_, value]) => value !== undefined)
		.map(([key, value]) => `${key}: ${String(value)}`)
		.join(', ') : ''
	
	console.log('Final formatted content length:', formattedTasks.length)
	console.log('Task count:', taskCount)
	console.log('Source info:', sourceInfo)
	console.log('Filter info:', filterInfo)
	console.log('=== FETCH TASKS UTILITY COMPLETED ===')
	
	return {
		tasks,
		taskCount,
		completedCount,
		incompleteCount,
		formattedTasks,
		sourceInfo,
		filterInfo
	}
}

/**
 * Formats the fetch tasks result into a display string
 * @param result - The fetch tasks result
 * @returns string - The formatted display string
 */
export function formatFetchTasksResult(result: FetchTasksResult): string {
	const { taskCount, formattedTasks, sourceInfo, filterInfo } = result
	const filterText = filterInfo ? ` with filters: ${filterInfo}` : ''
	return `[fetch_tasks${sourceInfo}${filterText}] Result:\nFound ${taskCount} tasks:\n\n${formattedTasks}\n`
} 