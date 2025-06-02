import { Server } from 'lucide-react'
import React from 'react'

import { useSettings } from "../../../contexts/SettingsContext"
import { t } from '../../../lang/helpers'
import { ApplyStatus, SearchWebToolArgs } from "../../../types/apply"

export default function UseMcpToolBlock({
	applyStatus,
	onApply,
	serverName,
	toolName,
	parameters,
	finish
}: {
	applyStatus: ApplyStatus
	onApply: (args: SearchWebToolArgs) => void
	serverName: string,
	toolName: string,
	parameters: Record<string, unknown>,
	finish: boolean
}) {

	const { settings } = useSettings()


	React.useEffect(() => {
		if (finish && applyStatus === ApplyStatus.Idle) {
			onApply({
				type: 'use_mcp_tool',
				server_name: serverName,
				tool_name: toolName,
				parameters: parameters,
			})
		}
	}, [finish])

	return (
		<div
			className={`infio-chat-code-block has-filename`
			}
		>
			<div className={'infio-chat-code-block-header'}>
				<div className={'infio-chat-code-block-header-filename'}>
					<Server size={14} className="infio-chat-code-block-header-icon" />
					use mcp tool from
					<span className="infio-mcp-tool-server-name">{serverName}</span>
				</div>
			</div>
			<div
				className="infio-reasoning-content-wrapper"
			>
				<div className="infio-mcp-tool-row">
					<div className="infio-mcp-tool-row-header">
						<div className="infio-mcp-tool-name-section">
							<span className="infio-mcp-tool-name">{toolName}</span>
						</div>
					</div>
					参数: <div className="infio-mcp-tool-parameters">
						<pre className="infio-json-pre"><code>{JSON.stringify(parameters, null, 2)}</code></pre>
					</div>
				</div>
			</div>
			<style>{`
				.infio-mcp-tool-row {
					padding: 12px;
					border-bottom: 1px solid var(--background-modifier-border);
					background-color: var(--background-primary);
					border-radius: var(--radius-s);
				}
				.infio-mcp-tool-row-header {
					display: flex;
					align-items: center;
					gap: 8px;
					margin-bottom: 8px;
				}
				.infio-mcp-tool-name {
					font-weight: 600;
					color: var(--text-normal);
					font-size: 14px;
				}
				.infio-mcp-tool-server-name {
					color: var(--text-accent);
					border-radius: 4px;
					margin-left: 4px;
					margin-right: 4px;
					font-weight: bold;
					font-size: 13px;
					display: inline-block;
				}
				.infio-mcp-tool-parameters {
					font-size: 14px;
					color: var(--text-muted);
					line-height: 1.4;
					margin: 8px 0 0 0;
				}
				.infio-json-pre {
					background: #282c34;
					color: #d4d4d4;
					border-radius: 4px;
					padding: 8px;
					font-size: 13px;
					overflow-x: auto;
					margin: 0;
				}
			`}</style>
		</div>
	)
} 
