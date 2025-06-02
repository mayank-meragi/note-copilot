import { ChevronDown, ChevronRight, CheckCheck } from 'lucide-react'
import React, { PropsWithChildren, useEffect, useRef, useState } from 'react'

import { useDarkModeContext } from "../../../contexts/DarkModeContext"
import { t } from '../../../lang/helpers'

import { MemoizedSyntaxHighlighterWrapper } from "./SyntaxHighlighterWrapper"

const processContent = (content: string): { serverName: string; processedContent: string } => {
	const lines = content.split('\n');
	const firstLine = lines[0];

	// 提取 serverName
	const serverNameMatch = firstLine.match(/\[use_mcp_tool for '([^']+)'\]/);
	const serverName = serverNameMatch ? serverNameMatch[1] : '';

	// 移除第一行并重新组合内容
	const processedContent = lines.slice(1).join('\n');

	return { serverName, processedContent };
};

export default function MarkdownToolResult({
	content,
}: PropsWithChildren<{
	content: string
}>) {
	const { isDarkMode } = useDarkModeContext()
	const containerRef = useRef<HTMLDivElement>(null)
	const [isOpen, setIsOpen] = useState(true)

	const { serverName, processedContent } = React.useMemo(() => processContent(content), [content]);

	useEffect(() => {
		if (containerRef.current) {
			containerRef.current.scrollTop = containerRef.current.scrollHeight
		}
	}, [processedContent])

	return (
		processedContent && (
			<div
				className={`infio-chat-code-block has-filename infio-reasoning-block`}
			>
				<div className={'infio-chat-code-block-header'}>
					<div className={'infio-chat-code-block-header-filename'}>
						<CheckCheck size={10} className="infio-chat-code-block-header-icon" />
						response from tool
						<span className="infio-mcp-tool-server-name">{serverName}</span>
					</div>
					<button
						className="clickable-icon infio-chat-list-dropdown"
						onClick={() => setIsOpen(!isOpen)}
					>
						{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
					</button>
				</div>
				<div
					ref={containerRef}
					className="infio-reasoning-content-wrapper"
				>
					<MemoizedSyntaxHighlighterWrapper
						isDarkMode={isDarkMode}
						language="markdown"
						hasFilename={true}
						wrapLines={true}
						isOpen={isOpen}
					>
						{processedContent}
					</MemoizedSyntaxHighlighterWrapper>
				</div>
				<style>
					{`
					.infio-mcp-tool-server-name {
						color: var(--text-accent);
					border-radius: 4px;
					margin-left: 4px;
					margin-right: 4px;
					font-weight: bold;
					font-size: 13px;
					display: inline-block;
				}
					`}
				</style>
			</div>
		)
	)
}
