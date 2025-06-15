import debounce from 'lodash.debounce'
import isEqual from 'lodash.isequal'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { editorStateToPlainText } from '../components/chat-view/chat-input/utils/editor-state-to-plain-text'
import { useApp } from '../contexts/AppContext'
import { ChatManager } from '../database/json/chat/ChatManager'
import { deserializeChatMessage, serializeChatMessage } from '../database/json/utils'
import { ChatConversationMeta, ChatMessage, ChatUserMessage } from '../types/chat'

type UseChatHistory = {
	createOrUpdateConversation: (
		id: string,
		messages: ChatMessage[],
	) => Promise<void>
	deleteConversation: (id: string) => Promise<void>
	getChatMessagesById: (id: string) => Promise<ChatMessage[] | null>
	updateConversationTitle: (id: string, title: string) => Promise<void>
	chatList: ChatConversationMeta[]
}

export function useChatHistory(): UseChatHistory {
	const app = useApp()
	const chatManager = useMemo(() => new ChatManager(app), [app])

	const [chatList, setChatList] = useState<ChatConversationMeta[]>([])

	const fetchChatList = useCallback(async () => {
		console.log('useChatHistory - fetching chat list...')
		const conversations = await chatManager.listChats()
		console.log('useChatHistory - fetched conversations:', conversations)
		console.log('useChatHistory - conversations length:', conversations.length)
		setChatList(conversations)
	}, [chatManager])

	useEffect(() => {
		void fetchChatList()
	}, [fetchChatList])

	const createOrUpdateConversation = useMemo(
		() =>
			debounce(
				async (id: string, messages: ChatMessage[]): Promise<void> => {
					console.log('useChatHistory - createOrUpdateConversation called with id:', id, 'messages length:', messages.length)
					const serializedMessages = messages.map(serializeChatMessage)
					const existingConversation = await chatManager.findById(id)

					if (existingConversation) {
						console.log('useChatHistory - updating existing conversation:', existingConversation.id)
						if (isEqual(existingConversation.messages, serializedMessages)) {
							console.log('useChatHistory - messages are identical, skipping update')
							return
						}
						await chatManager.updateChat(existingConversation.id, {
							messages: serializedMessages,
						})
					} else {
						console.log('useChatHistory - creating new conversation')
						const firstUserMessage = messages.find((v) => v.role === 'user') as ChatUserMessage

						const newChat = await chatManager.createChat({
							id,
							title: firstUserMessage?.content
								? editorStateToPlainText(firstUserMessage.content).substring(
									0,
									50,
								)
								: 'New chat',
							messages: serializedMessages,
						})
						console.log('useChatHistory - created new chat:', newChat)
					}

					console.log('useChatHistory - refreshing chat list after create/update')
					await fetchChatList()
				},
				300,
				{
					maxWait: 1000,
				},
			),
		[chatManager, fetchChatList],
	)

	const deleteConversation = useCallback(
		async (id: string): Promise<void> => {
			await chatManager.deleteChat(id)
			await fetchChatList()
		},
		[chatManager, fetchChatList],
	)

	const getChatMessagesById = useCallback(
		async (id: string): Promise<ChatMessage[] | null> => {
			const conversation = await chatManager.findById(id)
			if (!conversation) {
				return null
			}
			return conversation.messages.map((message) =>
				deserializeChatMessage(message, app),
			)
		},
		[chatManager, app],
	)

	const updateConversationTitle = useCallback(
		async (id: string, title: string): Promise<void> => {
			if (title.length === 0) {
				throw new Error('Chat title cannot be empty')
			}
			const conversation = await chatManager.findById(id)
			if (!conversation) {
				throw new Error('Conversation not found')
			}
			await chatManager.updateChat(conversation.id, {
				title,
			})
			await fetchChatList()
		},
		[chatManager, fetchChatList],
	)

	return {
		createOrUpdateConversation,
		deleteConversation,
		getChatMessagesById,
		updateConversationTitle,
		chatList,
	}
}
