import React, { useState } from 'react';

import { MODULAR_MCP_SERVERS, ModularMcpServer } from '../../core/mcp/modularServers';
import InfioPlugin from '../../main';
import { InfioSettings } from '../../types/settings';

// Copy to clipboard utility
const copyToClipboard = async (text: string) => {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch (err) {
		// Fallback for older browsers
		const textArea = document.createElement('textarea');
		textArea.value = text;
		document.body.appendChild(textArea);
		textArea.select();
		try {
			document.execCommand('copy');
			document.body.removeChild(textArea);
			return true;
		} catch (fallbackErr) {
			document.body.removeChild(textArea);
			return false;
		}
	}
};

interface McpSettingsProps {
	plugin: InfioPlugin;
	onSettingsUpdate: () => void;
}

export default function McpSettings({ plugin, onSettingsUpdate }: McpSettingsProps) {
	const [expandedServer, setExpandedServer] = useState<string | null>(null);
	const [copyStatus, setCopyStatus] = useState<Record<string, boolean>>({});
	const [testStatus, setTestStatus] = useState<Record<string, { testing: boolean; result?: string; error?: string }>>({});

	const handleCopyInstallCommand = async (serverName: string, command: string) => {
		const success = await copyToClipboard(command);
		setCopyStatus({ ...copyStatus, [serverName]: success });
		
		// Reset status after 2 seconds
		setTimeout(() => {
			setCopyStatus(prev => ({ ...prev, [serverName]: false }));
		}, 2000);
	};

	const testServerConnection = async (serverName: string) => {
		setTestStatus(prev => ({ ...prev, [serverName]: { testing: true } }));
		
		try {
			// Get the MCP hub and test the connection
			const mcpHub = await plugin.getMcpHub();
			if (!mcpHub) {
				throw new Error('MCP Hub not available');
			}

			// Test the server connection using the public method
			const result = await mcpHub.testModularServerConnection(serverName);
			
			if (result.success) {
				setTestStatus(prev => ({ 
					...prev, 
					[serverName]: { 
						testing: false, 
						result: `✅ ${result.message}` 
					} 
				}));

				// Clear success message after 5 seconds
				setTimeout(() => {
					setTestStatus(prev => ({ ...prev, [serverName]: { testing: false } }));
				}, 5000);
			} else {
				throw new Error(result.message);
			}

		} catch (error) {
			setTestStatus(prev => ({ 
				...prev, 
				[serverName]: { 
					testing: false, 
					error: `❌ ${error instanceof Error ? error.message : String(error)}` 
				} 
			}));

			// Clear error message after 8 seconds
			setTimeout(() => {
				setTestStatus(prev => ({ ...prev, [serverName]: { testing: false } }));
			}, 8000);
		}
	};

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
									<div className="setting-item-name">{server.displayName} {server.name === 'google-calendar' ? 'Credentials Path' : 'API Key'}</div>
									<div className="setting-item-description">
										{server.apiKeyDescription || 'API key required for this service'}
									</div>
								</div>
								<div className="setting-item-control">
									<input
										type={server.name === 'google-calendar' ? 'text' : 'password'}
										value={apiKey}
										onChange={(e) => updateApiKey(server.name, e.target.value)}
										placeholder={server.name === 'google-calendar' ? '/path/to/gcp-oauth.keys.json' : 'Enter API key...'}
										aria-label={`${server.displayName} ${server.name === 'google-calendar' ? 'credentials path' : 'API key'}`}
									/>
								</div>
							</div>
						)}

						{server.installInstructions && (
							<div className="mcp-install-instructions">
								<div className="install-instruction-header">
									<strong>Installation:</strong>
									<button
										className="mod-cta copy-install-button"
										onClick={() => handleCopyInstallCommand(server.name, server.installInstructions)}
									>
										{copyStatus[server.name] ? 'Copied!' : 'Copy Command'}
									</button>
								</div>
								<div className="install-command">
									<code>{server.installInstructions}</code>
								</div>
								{server.name === 'google-calendar' && (
									<div className="mcp-setup-instructions">
										<strong>Setup Instructions:</strong>
										<ol>
											<li><strong>Check Node.js version:</strong> This server requires Node.js 16+. Run <code>node --version</code> in terminal to check</li>
											<li><strong>Set up Google OAuth:</strong> Follow the <a href="https://github.com/nspady/google-calendar-mcp#google-cloud-setup" target="_blank" rel="noopener noreferrer">Google Cloud setup guide</a></li>
											<li><strong>Download your OAuth credentials:</strong> Save the JSON file to your computer</li>
											<li><strong>Enter the credentials path</strong> in the field above (e.g., /path/to/gcp-oauth.keys.json)</li>
											<li><strong>Enable this server</strong> in the settings above</li>
											<li><strong>First authentication:</strong> The plugin will automatically handle the OAuth flow when you first use calendar features</li>
										</ol>
										<div className="mcp-auto-setup-info">
											<strong>💡 Automatic Setup:</strong> The plugin will automatically download and run the Google Calendar MCP server using npx. No manual installation required!
										</div>
										{server.requirements?.nodeVersion && (
											<div className="mcp-requirements-info">
												<strong>⚠️ Requirements:</strong> {server.requirements.description}
											</div>
										)}
									</div>
								)}
							</div>
						)}

						<div className="mcp-server-actions">
							<button
								className="mod-cta"
								onClick={() => setExpandedServer(expandedServer === server.name ? null : server.name)}
							>
								{expandedServer === server.name ? 'Hide' : 'Show'} Configuration
							</button>
							
							<button
								className="mod-cta test-connection-button"
								onClick={() => testServerConnection(server.name)}
								disabled={testStatus[server.name]?.testing}
							>
								{testStatus[server.name]?.testing ? 'Testing...' : 'Test Connection'}
							</button>
						</div>

						{testStatus[server.name]?.result && (
							<div className="mcp-test-result success">
								{testStatus[server.name].result}
							</div>
						)}

						{testStatus[server.name]?.error && (
							<div className="mcp-test-result error">
								{testStatus[server.name].error}
							</div>
						)}

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