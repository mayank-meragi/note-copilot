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
}

export const MODULAR_MCP_SERVERS: Record<string, ModularMcpServer> = {
	"google-calendar": {
		name: "google-calendar",
		displayName: "Google Calendar",
		description: "Access and manage Google Calendar events",
		enabled: false,
		config: {
			type: "stdio",
			command: "npx",
			args: ["@modelcontextprotocol/server-google-calendar"],
			timeout: 60,
			env: {}
		},
		installInstructions: "Run: npm install -g @modelcontextprotocol/server-google-calendar",
		apiKeyRequired: true,
		apiKeyName: "GOOGLE_CALENDAR_API_KEY",
		apiKeyDescription: "Google Calendar API key from Google Cloud Console"
	},
	"weather": {
		name: "weather",
		displayName: "Weather Service",
		description: "Get weather information for locations",
		enabled: false,
		config: {
			type: "stdio",
			command: "npx",
			args: ["@modelcontextprotocol/server-weather"],
			timeout: 30,
			env: {}
		},
		installInstructions: "Run: npm install -g @modelcontextprotocol/server-weather",
		apiKeyRequired: true,
		apiKeyName: "WEATHER_API_KEY",
		apiKeyDescription: "OpenWeatherMap API key"
	},
	"github": {
		name: "github",
		displayName: "GitHub",
		description: "Access GitHub repositories and manage issues",
		enabled: false,
		config: {
			type: "stdio",
			command: "npx",
			args: ["@modelcontextprotocol/server-github"],
			timeout: 60,
			env: {}
		},
		installInstructions: "Run: npm install -g @modelcontextprotocol/server-github",
		apiKeyRequired: true,
		apiKeyName: "GITHUB_TOKEN",
		apiKeyDescription: "GitHub Personal Access Token"
	},
	"slack": {
		name: "slack",
		displayName: "Slack",
		description: "Send messages and manage Slack workspaces",
		enabled: false,
		config: {
			type: "stdio",
			command: "npx",
			args: ["@modelcontextprotocol/server-slack"],
			timeout: 60,
			env: {}
		},
		installInstructions: "Run: npm install -g @modelcontextprotocol/server-slack",
		apiKeyRequired: true,
		apiKeyName: "SLACK_BOT_TOKEN",
		apiKeyDescription: "Slack Bot User OAuth Token"
	},
	"notion": {
		name: "notion",
		displayName: "Notion",
		description: "Access and manage Notion databases and pages",
		enabled: false,
		config: {
			type: "stdio",
			command: "npx",
			args: ["@modelcontextprotocol/server-notion"],
			timeout: 60,
			env: {}
		},
		installInstructions: "Run: npm install -g @modelcontextprotocol/server-notion",
		apiKeyRequired: true,
		apiKeyName: "NOTION_API_KEY",
		apiKeyDescription: "Notion Integration Token"
	},
	"jira": {
		name: "jira",
		displayName: "Jira",
		description: "Manage Jira issues and projects",
		enabled: false,
		config: {
			type: "stdio",
			command: "npx",
			args: ["@modelcontextprotocol/server-jira"],
			timeout: 60,
			env: {}
		},
		installInstructions: "Run: npm install -g @modelcontextprotocol/server-jira",
		apiKeyRequired: true,
		apiKeyName: "JIRA_API_TOKEN",
		apiKeyDescription: "Jira API Token"
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