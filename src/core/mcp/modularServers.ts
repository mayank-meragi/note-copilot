export interface ModularMcpServer {
	name: string
	displayName: string
	description: string
	enabled: boolean
	config: {
		type: "stdio" | "sse"
		command?: string
		args?: string[]
		url?: string
		env?: Record<string, string>
		timeout?: number
		headers?: Record<string, string>
	}
	installInstructions?: string
	apiKeyRequired?: boolean
	apiKeyName?: string
	apiKeyDescription?: string
	requirements?: {
		nodeVersion?: string
		description?: string
	}
}

export const MODULAR_MCP_SERVERS: Record<string, ModularMcpServer> = {
	"google-calendar": {
		name: "google-calendar",
		displayName: "Google Calendar",
		description: "Access and manage Google Calendar events with multi-calendar support, event management, and smart scheduling",
		enabled: false,
		config: {
			type: "stdio",
			command: "npx",
			args: ["@cocal/google-calendar-mcp"],
			timeout: 60,
			env: {}
		},
		installInstructions: "No installation required - uses npx automatically",
		apiKeyRequired: true,
		apiKeyName: "GOOGLE_OAUTH_CREDENTIALS",
		apiKeyDescription: "Path to your Google OAuth credentials JSON file (e.g., /path/to/gcp-oauth.keys.json)",
		requirements: {
			nodeVersion: "16.0.0",
			description: "Requires Node.js 16+ for compatibility"
		}
	}
}

export function getModularServerConfig(serverName: string): ModularMcpServer | undefined {
	return MODULAR_MCP_SERVERS[serverName]
}

export function getAllModularServers(): ModularMcpServer[] {
	return Object.values(MODULAR_MCP_SERVERS)
}

export function getEnabledModularServers(): ModularMcpServer[] {
	return getAllModularServers().filter(server => server.enabled)
} 