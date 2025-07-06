import { Check, ChevronDown, ChevronRight, Loader2, Play, X } from 'lucide-react'
import React, { useState } from 'react'

import { t } from '../../../lang/helpers'
import { ApplyStatus, FetchTasksToolArgs } from '../../../types/apply'

export default function MarkdownFetchTasksBlock({
	applyStatus,
	onApply,
	source
}: {
	applyStatus: ApplyStatus
	onApply: (args: FetchTasksToolArgs) => void
	source?: string
}) {
	const [isOpen, setIsOpen] = useState(true)

	const handleExecute = () => {
		onApply({
			type: 'fetch_tasks',
			source: source,
			finish: true
		})
	}

	return (
		<div className="infio-chat-code-block has-filename infio-reasoning-block">
			<div className="infio-chat-code-block-header">
				<div className="infio-chat-code-block-header-filename">
					<Play size={10} className="infio-chat-code-block-header-icon" />
					{t('chat.reactMarkdown.fetchTasks')}
				</div>
				<div className="infio-chat-code-block-header-button">
					<button
						className="infio-chat-code-block-status-button"
						onClick={handleExecute}
						disabled={applyStatus !== ApplyStatus.Idle}
					>
						{
							applyStatus === ApplyStatus.Idle ? (
								<>
									<Play size={14} /> {t('chat.reactMarkdown.execute')}
								</>
							) : applyStatus === ApplyStatus.Applied ? (
								<>
									<Check size={14} /> {t('chat.reactMarkdown.done')}
								</>
							) : applyStatus === ApplyStatus.Failed ? (
								<>
									<X size={14} /> {t('chat.reactMarkdown.failed')}
								</>
							) : (
								<>
									<Loader2 className="spinner" size={14} /> {t('chat.reactMarkdown.executing')}
								</>
							)
						}
					</button>
					<button
						className="clickable-icon infio-chat-list-dropdown"
						onClick={() => setIsOpen(!isOpen)}
					>
						{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
					</button>
				</div>
			</div>
			<div
				className="infio-reasoning-content-wrapper"
				style={{ display: isOpen ? 'block' : 'none' }}
			>
				<div className="infio-chat-code-block-content">
					<div className="infio-chat-code-block-parameters">
						{source && (
							<div className="infio-chat-code-block-parameter">
								<span className="infio-chat-code-block-parameter-label">Source:</span>
								<span className="infio-chat-code-block-parameter-value">{source}</span>
							</div>
						)}
						{!source && (
							<div className="infio-chat-code-block-parameter">
								<span className="infio-chat-code-block-parameter-label">Source:</span>
								<span className="infio-chat-code-block-parameter-value">All files</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
} 