import { Clock, MessageSquare, Pencil, Search, Trash2 } from 'lucide-react'
import { Notice } from 'obsidian'
import React, { useMemo, useRef, useState } from 'react'

import { useChatHistory } from '../../hooks/use-chat-history'
import { t } from '../../lang/helpers'
import { ChatConversationMeta } from '../../types/chat'

export interface ChatHistoryViewProps {
	currentConversationId?: string
	onSelect?: (conversationId: string) => void
	onDelete?: (conversationId: string) => void
	onUpdateTitle?: (conversationId: string, newTitle: string) => void
}

const ChatHistoryView = ({
	currentConversationId,
	onSelect,
	onDelete,
	onUpdateTitle,
}: ChatHistoryViewProps) => {
	const {
		deleteConversation,
		updateConversationTitle,
		chatList,
	} = useChatHistory()

	// search term
	const [searchTerm, setSearchTerm] = useState('')

	// editing conversation id
	const [editingConversationId, setEditingConversationId] = useState<string | null>(null)

	const titleInputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

	// handle search
	const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value)
	}

	// filter conversations list
	const filteredConversations = useMemo(() => {
		if (!searchTerm.trim()) {
			return chatList
		}
		return chatList.filter(
			conversation =>
				conversation.title.toLowerCase().includes(searchTerm.toLowerCase())
		)
	}, [chatList, searchTerm])

	// delete conversation
	const handleDeleteConversation = async (id: string) => {
		try {
			await deleteConversation(id)
			onDelete?.(id)
		} catch (error) {
			new Notice(String(t('chat.errors.failedToDeleteConversation')))
			console.error('Failed to delete conversation', error)
		}
	}

	// edit conversation title
	const handleEditConversation = (conversation: ChatConversationMeta) => {
		setEditingConversationId(conversation.id)
	}

	// save edited title
	const handleSaveEdit = async (id: string) => {
		const titleInput = titleInputRefs.current.get(id)
		if (!titleInput || !titleInput.value.trim()) {
			new Notice(String(t('chat.errors.titleRequired')))
			return
		}
		
		try {
			await updateConversationTitle(id, titleInput.value.trim())
			onUpdateTitle?.(id, titleInput.value.trim())
			setEditingConversationId(null)
		} catch (error) {
			new Notice(String(t('chat.errors.failedToUpdateTitle')))
			console.error('Failed to update conversation title', error)
		}
	}

	// select conversation
	const handleSelectConversation = (conversationId: string) => {
		onSelect?.(conversationId)
	}

	// format date
	const formatDate = (timestamp: number) => {
		const date = new Date(timestamp)
		const now = new Date()
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
		const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
		
		if (date >= today) {
			return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		} else if (date >= yesterday) {
			return t('chat.history.yesterday')
		} else {
			return date.toLocaleDateString()
		}
	}

	return (
		<div className="infio-chat-history-container">
			{/* header */}
			<div className="infio-chat-history-header">
				<div className="infio-chat-history-title">
					<h2>{t('chat.history.title')}</h2>
				</div>
			</div>

			{/* description */}
			<div className="infio-chat-history-tip">
				{t('chat.history.description')}
			</div>

			{/* search bar */}
			<div className="infio-chat-history-search">
				<Search size={18} className="infio-chat-history-search-icon" />
				<input
					type="text"
					placeholder={t('chat.history.searchPlaceholder')}
					value={searchTerm}
					onChange={handleSearch}
					className="infio-chat-history-search-input"
				/>
			</div>

			{/* conversations list */}
			<div className="infio-chat-history-list">
				{filteredConversations.length === 0 ? (
					<div className="infio-chat-history-empty">
						<MessageSquare size={48} className="infio-chat-history-empty-icon" />
						<p>{searchTerm ? t('chat.history.noMatchingChats') : t('chat.history.noChats')}</p>
					</div>
				) : (
					filteredConversations.map(conversation => (
						<div 
							key={conversation.id} 
							className={`infio-chat-history-item ${currentConversationId === conversation.id ? 'active' : ''}`}
						>
							{editingConversationId === conversation.id ? (
								// edit mode
								<div className="infio-chat-history-edit-mode">
									<input
										type="text"
										defaultValue={conversation.title}
										className="infio-chat-history-edit-title"
										ref={(el) => {
											if (el) titleInputRefs.current.set(conversation.id, el)
										}}
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												handleSaveEdit(conversation.id)
											} else if (e.key === 'Escape') {
												setEditingConversationId(null)
											}
										}}
										autoFocus
									/>
									<div className="infio-chat-history-actions">
										<button
											onClick={() => handleSaveEdit(conversation.id)}
											className="infio-chat-history-save-btn"
										>
											<span>{t('chat.history.save')}</span>
										</button>
										<button
											onClick={() => setEditingConversationId(null)}
											className="infio-chat-history-cancel-btn"
										>
											<span>{t('chat.history.cancel')}</span>
										</button>
									</div>
								</div>
							) : (
								// view mode
								<div 
									className="infio-chat-history-view-mode"
									onClick={() => handleSelectConversation(conversation.id)}
								>
									<div className="infio-chat-history-content">
										<div className="infio-chat-history-date">
											<Clock size={12} />
											{formatDate(conversation.updatedAt)}
										</div>
										<div className="infio-chat-history-conversation-title">{conversation.title}</div>
									</div>
									<div className="infio-chat-history-actions">
										<button
											onClick={(e) => {
												e.stopPropagation()
												handleEditConversation(conversation)
											}}
											className="infio-chat-history-btn"
											title={t('chat.history.editTitle')}
										>
											<Pencil size={16} />
										</button>
										<button
											onClick={(e) => {
												e.stopPropagation()
												handleDeleteConversation(conversation.id)
											}}
											className="infio-chat-history-btn infio-chat-history-delete-btn"
											title={t('chat.history.deleteConversation')}
										>
											<Trash2 size={16} />
										</button>
									</div>
								</div>
							)}
						</div>
					))
				)}
			</div>

			{/* Styles */}
			<style>
				{`
				.infio-chat-history-container {
					display: flex;
					flex-direction: column;
					padding: 16px;
					gap: 16px;
					color: var(--text-normal);
					height: 100%;
					overflow-y: auto;
					/* 隐藏滚动条 */
					scrollbar-width: none; /* Firefox */
					-ms-overflow-style: none; /* IE and Edge */
				}

				.infio-chat-history-container::-webkit-scrollbar {
					display: none; /* Webkit browsers */
				}

				.infio-chat-history-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
				}

				.infio-chat-history-title h2 {
					margin: 0;
					font-size: 24px;
				}

				.infio-chat-history-tip {
					color: var(--text-muted);
					font-size: 14px;
					margin-bottom: 8px;
				}

				.infio-chat-history-add-btn:disabled {
					background-color: var(--background-modifier-form-field);
					color: var(--text-faint);
					cursor: not-allowed;
				}

				.infio-chat-history-search {
					display: flex;
					align-items: center;
					background-color: var(--background-primary) !important;
					border: 1px solid var(--background-modifier-border);
					border-radius: var(--radius-s);
					padding: 6px 12px;
					margin-bottom: var(--size-4-3);
					transition: all 0.2s ease;
					height: 36px;
					max-width: 100%;
				}

				.infio-chat-history-search:focus-within {
					border-color: var(--background-modifier-border-focus);
				}

				.infio-chat-history-search-icon {
					color: var(--text-muted);
					margin-right: 8px;
					opacity: 0.8;
				}

				.infio-chat-history-search-input {
					background-color: transparent !important;
					border: none !important;
					color: var(--text-normal);
					padding: 4px 0;
					font-size: 14px;
					width: 100%;
					outline: none;
					height: 24px;
					&:focus {
						outline: none !important;
						border: none !important;
						box-shadow: none !important;
					}
				}

				.infio-chat-history-search-input::placeholder {
					color: var(--text-faint);
					opacity: 0.8;
				}

				.infio-chat-history-list {
					display: flex;
					flex-direction: column;
					gap: 8px;
					flex: 1;
					overflow-y: auto;
					/* 隐藏滚动条 */
					scrollbar-width: none; /* Firefox */
					-ms-overflow-style: none; /* IE and Edge */
				}

				.infio-chat-history-list::-webkit-scrollbar {
					display: none; /* Webkit browsers */
				}

				.infio-chat-history-empty {
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					padding: 48px 16px;
					color: var(--text-muted);
					text-align: center;
					gap: 16px;
				}

				.infio-chat-history-empty-icon {
					opacity: 0.5;
				}

				.infio-chat-history-item {
					border: 1px solid var(--background-modifier-border);
					border-radius: var(--radius-s);
					background-color: var(--background-primary);
					transition: all 0.2s ease;
				}

				.infio-chat-history-item:hover {
					background-color: var(--background-modifier-hover);
					border-color: var(--background-modifier-border-hover);
				}

				.infio-chat-history-item.active {
					background-color: var(--background-modifier-active);
					border-color: var(--text-accent);
				}

				.infio-chat-history-view-mode {
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 12px;
					cursor: pointer;
				}

				.infio-chat-history-content {
					flex: 1;
					min-width: 0;
					display: flex;
					flex-direction: column;
					gap: 4px;
				}

				.infio-chat-history-conversation-title {
					font-weight: 500;
					color: var(--text-normal);
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					font-size: 14px;
				}

				.infio-chat-history-date {
					display: flex;
					align-items: center;
					gap: 4px;
					color: var(--text-muted);
					font-size: 12px;
				}

				.infio-chat-history-actions {
					display: flex;
					gap: 4px;
					opacity: 0;
					transition: opacity 0.2s ease;
				}

				.infio-chat-history-item:hover .infio-chat-history-actions {
					opacity: 1;
				}

				.infio-chat-history-btn {
					display: flex;
					align-items: center;
					justify-content: center;
					background-color: transparent !important;
					border: none !important;
					box-shadow: none !important;
					color: var(--text-muted);
					padding: 0 !important;
					margin: 0 !important;
					width: 24px !important;
					height: 24px !important;

					&:hover {
						background-color: var(--background-modifier-hover) !important;
					}
				}

				.infio-chat-history-btn:hover {
					background-color: var(--background-modifier-hover);
					color: var(--text-normal);
				}

				.infio-chat-history-delete-btn:hover {
					background-color: var(--background-modifier-error);
					color: var(--text-error);
				}

				.infio-chat-history-edit-mode {
					padding: 12px;
					display: flex;
					flex-direction: column;
					gap: 12px;
				}

				.infio-chat-history-edit-title {
					background-color: var(--background-primary);
					border: 1px solid var(--background-modifier-border);
					border-radius: var(--radius-s);
					color: var(--text-normal);
					padding: var(--size-4-2);
					font-size: var(--font-ui-small);
					width: 100%;
					box-sizing: border-box;
				}

				.infio-chat-history-edit-title:focus {
					outline: none;
					border-color: var(--text-accent);
				}

				.infio-chat-history-save-btn,
				.infio-chat-history-cancel-btn {
					border: 1px solid var(--background-modifier-border);
					color: var(--text-normal);
					padding: 6px 12px;
					border-radius: var(--radius-s);
					cursor: pointer;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: var(--font-ui-small);
					transition: background-color 0.2s ease;
				}

				.infio-chat-history-save-btn {
					background-color: var(--interactive-accent);
					color: var(--text-on-accent);
					border-color: var(--interactive-accent);
				}

				.infio-chat-history-save-btn:hover {
					background-color: var(--interactive-accent-hover);
				}

				.infio-chat-history-cancel-btn {
					background-color: transparent;
				}

				.infio-chat-history-cancel-btn:hover {
					background-color: var(--background-modifier-hover);
				}
				`}
			</style>
		</div>
	)
}

export default ChatHistoryView

// Export the original ChatHistory component for backward compatibility
export { ChatHistoryView as ChatHistory }
