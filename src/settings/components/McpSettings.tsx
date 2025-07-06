import React, { useState } from 'react';

import { MODULAR_MCP_SERVERS, ModularMcpServer } from '../../core/mcp/modularServers';
import InfioPlugin from '../../main';
import { InfioSettings } from '../../types/settings';

interface McpSettingsProps {
	plugin: InfioPlugin;
	onSettingsUpdate: () => void;
}

export default function McpSettings({ plugin, onSettingsUpdate }: McpSettingsProps) {
	const [expandedServer, setExpandedServer] = useState<string | null>(null);

	const updateMcpServer = async (serverName: string, updates: Partial<InfioSettings['mcpServers'][string]>) => {
		const currentSettings = plugin.settings.mcpServers || {};
		const updatedSettings = {
			...plugin.settings,
			mcpServers: {
				...currentSettings,
				[serverName]: {
					...currentSettings[serverName],
					...updates,
				},
			},
		};
		await plugin.setSettings(updatedSettings);
		onSettingsUpdate();
	};

	const toggleServer = async (serverName: string, enabled: boolean) => {
		await updateMcpServer(serverName, { enabled });
	};

	const updateApiKey = async (serverName: string, apiKey: string) => {
		await updateMcpServer(serverName, { apiKey });
	};

	const renderServerSettings = (server: ModularMcpServer) => {
		const currentSettings = plugin.settings.mcpServers?.[server.name] || {};
		const isEnabled = currentSettings.enabled || false;
		const apiKey = currentSettings.apiKey || '';

		return (
			<div key={server.name} className="mcp-server-setting">
				<div className="setting-item">
					<div className="setting-item-info">
						<div className="setting-item-name">{server.displayName}</div>
						<div className="setting-item-description">{server.description}</div>
					</div>
					<div className="setting-item-control">
						<input
							type="checkbox"
							checked={isEnabled}
							onChange={(e) => toggleServer(server.name, e.target.checked)}
							aria-label={`Enable ${server.displayName} MCP server`}
						/>
					</div>
				</div>

				{isEnabled && (
					<div className="mcp-server-details">
						{server.apiKeyRequired && (
							<div className="setting-item">
								<div className="setting-item-info">
									<div className="setting-item-name">{server.displayName} API Key</div>
									<div className="setting-item-description">
										{server.apiKeyDescription || 'API key required for this service'}
									</div>
								</div>
								<div className="setting-item-control">
									<input
										type="password"
										value={apiKey}
										onChange={(e) => updateApiKey(server.name, e.target.value)}
										placeholder="Enter API key..."
										aria-label={`${server.displayName} API key`}
									/>
								</div>
							</div>
						)}

						{server.installInstructions && (
							<div className="mcp-install-instructions">
								<strong>Installation:</strong> {server.installInstructions}
							</div>
						)}

						<button
							className="mod-cta"
							onClick={() => setExpandedServer(expandedServer === server.name ? null : server.name)}
						>
							{expandedServer === server.name ? 'Hide' : 'Show'} Configuration
						</button>

						{expandedServer === server.name && (
							<div className="mcp-config-details">
								<pre>{JSON.stringify(server.config, null, 2)}</pre>
							</div>
						)}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="mcp-settings">
			<div className="setting-item">
				<div className="setting-item-info">
					<div className="setting-item-name">Enable MCP Servers</div>
					<div className="setting-item-description">
						Enable Model Context Protocol servers to extend functionality with external services
					</div>
				</div>
				<div className="setting-item-control">
					<input
						type="checkbox"
						checked={plugin.settings.mcpEnabled}
						onChange={async (e) => {
							await plugin.setSettings({
								...plugin.settings,
								mcpEnabled: e.target.checked,
							});
							onSettingsUpdate();
						}}
						aria-label="Enable MCP Servers"
					/>
				</div>
			</div>

			{plugin.settings.mcpEnabled && (
				<div className="mcp-servers-list">
					<h4>Available MCP Servers</h4>
					{Object.values(MODULAR_MCP_SERVERS).map(renderServerSettings)}
				</div>
			)}
		</div>
	);
} 