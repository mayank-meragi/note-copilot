import {
	Content,
	GoogleGenAI,
	Part,
	type GenerateContentConfig,
	type GenerateContentParameters,
	type GenerateContentResponse,
} from "@google/genai"

import { LLMModel } from '../../types/llm/model'
import {
	LLMOptions,
	LLMRequestNonStreaming,
	LLMRequestStreaming,
	RequestMessage,
} from '../../types/llm/request'
import {
	LLMResponseNonStreaming,
	LLMResponseStreaming,
} from '../../types/llm/response'
import {
	GeminiModelId,
	ModelInfo,
	geminiDefaultModelId,
	geminiModels
} from "../../utils/api"
import { parseImageDataUrl } from '../../utils/image'

import { BaseLLMProvider } from './base'
import {
	LLMAPIKeyInvalidException,
	LLMAPIKeyNotSetException,
} from './exception'

/**
 * Note on OpenAI Compatibility API:
 * Gemini provides an OpenAI-compatible endpoint (https://ai.google.dev/gemini-api/docs/openai)
 * which allows using the OpenAI SDK with Gemini models. However, there are currently CORS issues
 * preventing its use in Obsidian. Consider switching to this endpoint in the future once these
 * issues are resolved.
 */
export class GeminiProvider implements BaseLLMProvider {
	private client: GoogleGenAI
	private apiKey: string
	private baseUrl: string

	constructor(apiKey: string, baseUrl?: string) {
		this.apiKey = apiKey
		this.baseUrl = baseUrl
		this.client = new GoogleGenAI({ apiKey })
	}

	getModel(modelId: string) {
		let id = modelId
		let info: ModelInfo = geminiModels[id as GeminiModelId]

		if (id?.endsWith(":thinking")) {

			if (geminiModels[id as GeminiModelId]) {
				info = geminiModels[id as GeminiModelId]

				id = id.slice(0, -":thinking".length)

				return {
					id,
					info,
					thinkingConfig: info.thinkingConfig,
					maxOutputTokens: info.maxTokens ?? undefined,
				}
			}
		}

		if (!info) {
			id = geminiDefaultModelId
			info = geminiModels[geminiDefaultModelId]
		}

		return { id, info }
	}

	async generateResponse(
		model: LLMModel,
		request: LLMRequestNonStreaming,
		options?: LLMOptions,
	): Promise<LLMResponseNonStreaming> {
		if (!this.apiKey) {
			throw new LLMAPIKeyNotSetException(
				`Gemini API key is missing. Please set it in settings menu.`,
			)
		}

		const { id: modelName, thinkingConfig, maxOutputTokens, info } = this.getModel(model.modelId)

		const systemMessages = request.messages.filter((m) => m.role === 'system')
		const systemInstruction: string | undefined =
			systemMessages.length > 0
				? systemMessages.map((m) => m.content).join('\n')
				: undefined

		try {

			const config: GenerateContentConfig = {
				systemInstruction,
				httpOptions: this.baseUrl ? { baseUrl: this.baseUrl } : undefined,
				thinkingConfig: thinkingConfig,
				temperature: request.temperature ?? 0,
				topP: request.top_p ?? 1,
				presencePenalty: request.presence_penalty ?? 0,
				frequencyPenalty: request.frequency_penalty ?? 0,
			}
			const params: GenerateContentParameters = {
				model: modelName,
				contents: request.messages
					.map((message) => GeminiProvider.parseRequestMessage(message))
					.filter((m): m is Content => m !== null),
				config,
			}

			const result = await this.client.models.generateContent(params)
			const messageId = crypto.randomUUID() // Gemini does not return a message id
			return GeminiProvider.parseNonStreamingResponse(
				result,
				request.model,
				messageId,
			)
		} catch (error) {
			const isInvalidApiKey =
				error.message?.includes('API_KEY_INVALID') ||
				error.message?.includes('API key not valid')

			if (isInvalidApiKey) {
				throw new LLMAPIKeyInvalidException(
					`Gemini API key is invalid. Please update it in settings menu.`,
				)
			}

			throw error
		}
	}

	async streamResponse(
		model: LLMModel,
		request: LLMRequestStreaming,
		options?: LLMOptions,
	): Promise<AsyncIterable<LLMResponseStreaming>> {
		if (!this.apiKey) {
			throw new LLMAPIKeyNotSetException(
				`Gemini API key is missing. Please set it in settings menu.`,
			)
		}
		const { id: modelName, thinkingConfig, maxOutputTokens, info } = this.getModel(model.modelId)

		console.log("thinkingConfig", info, thinkingConfig)

		const systemMessages = request.messages.filter((m) => m.role === 'system')
		const systemInstruction: string | undefined =
			systemMessages.length > 0
				? systemMessages.map((m) => m.content).join('\n')
				: undefined

		try {
			const config: GenerateContentConfig = {
				systemInstruction,
				httpOptions: this.baseUrl ? { baseUrl: this.baseUrl } : undefined,
				thinkingConfig: thinkingConfig,
				temperature: request.temperature ?? 0,
				topP: request.top_p ?? 1,
				presencePenalty: request.presence_penalty ?? 0,
				frequencyPenalty: request.frequency_penalty ?? 0,
			}
			const params: GenerateContentParameters = {
				model: modelName,
				contents: request.messages
					.map((message) => GeminiProvider.parseRequestMessage(message))
					.filter((m): m is Content => m !== null),
				config,
			}

			const stream = await this.client.models.generateContentStream(params)
			const messageId = crypto.randomUUID() // Gemini does not return a message id
			return this.streamResponseGenerator(stream, request.model, messageId)
		} catch (error) {
			const isInvalidApiKey =
				error.message?.includes('API_KEY_INVALID') ||
				error.message?.includes('API key not valid')

			if (isInvalidApiKey) {
				throw new LLMAPIKeyInvalidException(
					`Gemini API key is invalid. Please update it in settings menu.`,
				)
			}

			throw error
		}
	}

	private async *streamResponseGenerator(
		stream: AsyncGenerator<GenerateContentResponse>,
		model: string,
		messageId: string,
	): AsyncIterable<LLMResponseStreaming> {
		let lastChunkTime = Date.now();
		const TIMEOUT_MS = 30000; // 30 seconds
		let chunkCount = 0;
		const timeoutCheck = setInterval(() => {
			if (Date.now() - lastChunkTime > TIMEOUT_MS) {
				console.warn('[Gemini] Streaming appears stuck: no chunk received for', TIMEOUT_MS / 1000, 'seconds.');
			}
		}, 5000);
		try {
			for await (const chunk of stream) {
				lastChunkTime = Date.now();
				chunkCount++;
				console.debug(`[Gemini] Received stream chunk #${chunkCount}:`, chunk);
				yield GeminiProvider.parseStreamingResponseChunk(chunk, model, messageId);
			}
			console.info(`[Gemini] Stream ended after ${chunkCount} chunks.`);
		} catch (err) {
			console.error('[Gemini] Error during streaming:', err);
			throw err;
		} finally {
			clearInterval(timeoutCheck);
			if (chunkCount === 0) {
				console.warn('[Gemini] Stream ended with zero chunks received.');
			}
		}
	}

	static parseRequestMessage(message: RequestMessage): Content | null {
		if (message.role === 'system') {
			return null
		}

		if (Array.isArray(message.content)) {
			return {
				role: message.role === 'user' ? 'user' : 'model',
				parts: message.content.map((part) => {
					switch (part.type) {
						case 'text':
							return { text: part.text }
						case 'image_url': {
							const { mimeType, base64Data } = parseImageDataUrl(
								part.image_url.url,
							)
							GeminiProvider.validateImageType(mimeType)

							return {
								inlineData: {
									data: base64Data,
									mimeType,
								},
							}
						}
					}
				}) as Part[],
			}
		}

		return {
			role: message.role === 'user' ? 'user' : 'model',
			parts: [
				{
					text: message.content,
				},
			],
		}
	}

	static parseNonStreamingResponse(
		response: GenerateContentResponse,
		model: string,
		messageId: string,
	): LLMResponseNonStreaming {
		const parts = response.candidates?.[0]?.content?.parts || []
		let content = ''
		let reasoning_content = ''
		for (const part of parts) {
			if (part.thought) {
				reasoning_content += part.text || ''
			} else {
				content += part.text || ''
			}
		}
		return {
			id: messageId,
			choices: [
				{
					finish_reason:
						response.candidates?.[0]?.finishReason ?? null,
					message: {
						content,
						reasoning_content,
						role: 'assistant',
					},
				},
			],
			created: Date.now(),
			model: model,
			object: 'chat.completion',
			usage: response.usageMetadata
				? {
					prompt_tokens: response.usageMetadata.promptTokenCount,
					completion_tokens:
						response.usageMetadata.candidatesTokenCount,
					total_tokens: response.usageMetadata.totalTokenCount,
				}
				: undefined,
		}
	}

	static parseStreamingResponseChunk(
		chunk: GenerateContentResponse,
		model: string,
		messageId: string,
	): LLMResponseStreaming {
		const firstCandidate = chunk.candidates?.[0]
		const parts = firstCandidate?.content?.parts || []
		let content = ''
		let reasoning_content = ''
		for (const part of parts) {
			if (part.thought) {
				reasoning_content += part.text || ''
			} else {
				content += part.text || ''
			}
		}
		return {
			id: messageId,
			choices: [
				{
					finish_reason: firstCandidate?.finishReason ?? null,
					delta: {
						content,
						reasoning_content,
					},
				},
			],
			created: Date.now(),
			model: model,
			object: 'chat.completion.chunk',
			usage: chunk.usageMetadata
				? {
					prompt_tokens: chunk.usageMetadata.promptTokenCount,
					completion_tokens: chunk.usageMetadata.candidatesTokenCount,
					total_tokens: chunk.usageMetadata.totalTokenCount,
				}
				: undefined,
		}
	}

	private static validateImageType(mimeType: string) {
		const SUPPORTED_IMAGE_TYPES = [
			'image/png',
			'image/jpeg',
			'image/webp',
			'image/heic',
			'image/heif',
		]
		if (!SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
			throw new Error(
				`Gemini does not support image type ${mimeType}. Supported types: ${SUPPORTED_IMAGE_TYPES.join(
					', ',
				)}`,
			)
		}
	}
}
