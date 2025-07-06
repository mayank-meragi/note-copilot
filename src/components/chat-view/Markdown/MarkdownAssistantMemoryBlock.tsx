import { Brain, Check, Loader2, X } from 'lucide-react'
import { PropsWithChildren, useState } from 'react'

import { useDarkModeContext } from "../../../contexts/DarkModeContext"
import { t } from '../../../lang/helpers'
import { ApplyStatus, ToolArgs } from "../../../types/apply"

import { MemoizedSyntaxHighlighterWrapper } from "./SyntaxHighlighterWrapper"

export default function MarkdownAssistantMemoryBlock({
	action,
	content,
	applyStatus,
	onApply,
}: PropsWithChildren<{
	action: 'write'
	content: string
	applyStatus: ApplyStatus
	onApply: (args: ToolArgs) => void
}>) {
	const [applying, setApplying] = useState(false)
	const { isDarkMode } = useDarkModeContext()

	const handleApply = async () => {
		if (applyStatus !== ApplyStatus.Idle) {
			return
		}
		setApplying(true)
		onApply({
			type: 'assistant_memory',
			action: action,
			content: content,
		})
	}

	return (
		<div className={`infio-chat-code-block has-filename`}>
			<div className={'infio-chat-code-block-header'}>
				<div className={'infio-chat-code-block-header-filename'}>
					<Brain size={10} className="infio-chat-code-block-header-icon" />
					Write Memory
				</div>
				<div className={'infio-chat-code-block-header-button'}>
					<button
						onClick={handleApply}
						style={{ color: '#008000' }}
						disabled={applyStatus !== ApplyStatus.Idle || applying}
					>
						{applyStatus === ApplyStatus.Idle ? (
							applying ? (
								<>
									<Loader2 className="spinner" size={14} /> {t('chat.reactMarkdown.allowing')}
								</>
							) : (
								t('chat.reactMarkdown.allow')
							)
						) : applyStatus === ApplyStatus.Applied ? (
							<>
								<Check size={14} /> {t('chat.reactMarkdown.success')}
							</>
						) : (
							<>
								<X size={14} /> {t('chat.reactMarkdown.failed')}
							</>
						)}
					</button>
				</div>
			</div>
			{content && (
				<MemoizedSyntaxHighlighterWrapper
					isDarkMode={isDarkMode}
					language="markdown"
					hasFilename={true}
					wrapLines={true}
					isOpen={true}
				>
					{content}
				</MemoizedSyntaxHighlighterWrapper>
			)}
		</div>
	)
} 