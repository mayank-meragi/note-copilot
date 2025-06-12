import React, { useState } from 'react';

import { t } from '../../lang/helpers';
import InfioPlugin from "../../main";
import { ApiProvider } from '../../types/llm/model';
import { InfioSettings } from '../../types/settings';
import { GetAllProviders } from '../../utils/api';
import { getProviderApiUrl } from '../../utils/provider-urls';

import { ApiKeyComponent, CustomUrlComponent } from './FormComponents';
import { ComboBoxComponent } from './ProviderModelsPicker';

type CustomProviderSettingsProps = {
	plugin: InfioPlugin;
	onSettingsUpdate?: () => void;
}

type ProviderSettingKey =
	| 'infioProvider'
	| 'openrouterProvider'
	| 'openaiProvider'
	| 'siliconflowProvider'
	| 'alibabaQwenProvider'
	| 'anthropicProvider'
	| 'deepseekProvider'
	| 'googleProvider'
	| 'groqProvider'
	| 'grokProvider'
	| 'ollamaProvider'
	| 'openaicompatibleProvider';

const keyMap: Record<ApiProvider, ProviderSettingKey> = {
	'Infio': 'infioProvider',
	'OpenRouter': 'openrouterProvider',
	'OpenAI': 'openaiProvider',
	'SiliconFlow': 'siliconflowProvider',
	'AlibabaQwen': 'alibabaQwenProvider',
	'Anthropic': 'anthropicProvider',
	'Deepseek': 'deepseekProvider',
	'Google': 'googleProvider',
	'Groq': 'groqProvider',
	'Grok': 'grokProvider',
	'Ollama': 'ollamaProvider',
	'OpenAICompatible': 'openaicompatibleProvider',
};

const getProviderSettingKey = (provider: ApiProvider): ProviderSettingKey => {
	return keyMap[provider];
};

const CustomProviderSettings: React.FC<CustomProviderSettingsProps> = ({ plugin, onSettingsUpdate }) => {
	const settings = plugin.settings;
	const [activeTab, setActiveTab] = useState<ApiProvider>(ApiProvider.Infio);

	const handleSettingsUpdate = async (newSettings: InfioSettings) => {
		await plugin.setSettings(newSettings);
		onSettingsUpdate?.();
	};

	const providers = GetAllProviders();

	const updateProviderApiKey = (provider: ApiProvider, value: string) => {
		const providerKey = getProviderSettingKey(provider);
		const providerSettings = settings[providerKey];

		handleSettingsUpdate({
			...settings,
			[providerKey]: {
				...providerSettings,
				apiKey: value
			}
		});
	};

	const updateProviderUseCustomUrl = (provider: ApiProvider, value: boolean) => {
		const providerKey = getProviderSettingKey(provider);
		const providerSettings = settings[providerKey];

		handleSettingsUpdate({
			...settings,
			[providerKey]: {
				...providerSettings,
				useCustomUrl: value
			}
		});
	};

	const updateProviderBaseUrl = (provider: ApiProvider, value: string) => {
		const providerKey = getProviderSettingKey(provider);
		const providerSettings = settings[providerKey];

		handleSettingsUpdate({
			...settings,
			[providerKey]: {
				...providerSettings,
				baseUrl: value
			}
		});
	};

	const testApiConnection = async (provider: ApiProvider) => {
		// TODO: 实现API连接测试逻辑
		// 这里应该根据provider类型调用对应的API测试接口
		console.log(`Testing connection for ${provider}...`);
		
		// 模拟延迟
		await new Promise(resolve => setTimeout(resolve, 1000));
		
		// 模拟随机成功/失败（用于演示）
		if (Math.random() > 0.5) {
			throw new Error('Connection test failed');
		}
	};

	const getProviderSetting = (provider: ApiProvider) => {
		const providerKey = getProviderSettingKey(provider);
		return settings[providerKey] || {};
	};

	const updateChatModelId = (provider: ApiProvider, modelId: string) => {
		handleSettingsUpdate({
			...settings,
			chatModelProvider: provider,
			chatModelId: modelId
		});
	};

	const updateApplyModelId = (provider: ApiProvider, modelId: string) => {
		handleSettingsUpdate({
			...settings,
			applyModelProvider: provider,
			applyModelId: modelId
		});
	};

	const updateEmbeddingModelId = (provider: ApiProvider, modelId: string) => {
		handleSettingsUpdate({
			...settings,
			embeddingModelProvider: provider,
			embeddingModelId: modelId
		});
	};

	// 生成包含链接的API Key描述
	const generateApiKeyDescription = (provider: ApiProvider): React.ReactNode => {
		const apiUrl = getProviderApiUrl(provider);
		const baseDescription = t("settings.ApiProvider.enterApiKeyDescription");
		
		if (!apiUrl) {
			// 如果没有URL，直接移除占位符
			return baseDescription.replace('{provider_api_url}', '');
		}

		// 将占位符替换为实际的链接元素
		const parts = baseDescription.split('{provider_api_url}');
		if (parts.length !== 2) {
			return baseDescription;
		}

		return (
			<>
				{parts[0]}
				<a 
					href={apiUrl} 
					target="_blank" 
					rel="noopener noreferrer"
					className="provider-api-link"
				>
					{apiUrl}
				</a>
				{parts[1]}
			</>
		);
	};

	const renderProviderConfig = (provider: ApiProvider) => {
		const providerSetting = getProviderSetting(provider);

		return (
			<div className="provider-config">
				{provider !== ApiProvider.Ollama && (
					<ApiKeyComponent
						name={
							<>
								设置 <span className="provider-name-highlight">{provider}</span> API Key
							</>
						}
						placeholder={t("settings.ApiProvider.enterApiKey")}
						description={generateApiKeyDescription(provider)}
						value={providerSetting.apiKey || ''}
						onChange={(value) => updateProviderApiKey(provider, value)}
						onTest={() => testApiConnection(provider)}
					/>
				)}

				<CustomUrlComponent
					name={t("settings.ApiProvider.useCustomBaseUrl")}
					placeholder={t("settings.ApiProvider.enterCustomUrl")}
					useCustomUrl={providerSetting.useCustomUrl || false}
					baseUrl={providerSetting.baseUrl || ''}
					onToggleCustomUrl={(value) => updateProviderUseCustomUrl(provider, value)}
					onChangeBaseUrl={(value) => updateProviderBaseUrl(provider, value)}
				/>
			</div>
		);
	};

	return (
		<div className="provider-settings-container">
			{/* 提供商配置区域 */}
			<div className="provider-config-section">
				<h2 className="section-title">{t("settings.ApiProvider.label")}</h2>
				<p className="section-description">{t("settings.ApiProvider.labelDescription")}</p>
				{/* 提供商标签页 */}
				<div className="provider-tabs">
					{providers.map((provider) => (
						<button
							key={provider}
							className={`provider-tab ${activeTab === provider ? 'active' : ''}`}
							onClick={() => setActiveTab(provider)}
						>
							{provider}
						</button>
					))}
				</div>

				{/* 当前选中提供商的配置 */}
				<div className="provider-config-content">
					{renderProviderConfig(activeTab)}
				</div>
			</div>

			{/* 模型选择区域 */}
			<div className="model-selection-section">
				<h2 className="section-title">模型选择</h2>

				<div className="model-selectors">
					<ComboBoxComponent
						name={t("settings.Models.chatModel")}
						description={t("settings.Models.chatModelDescription")}
						settings={settings}
						provider={settings.chatModelProvider || ApiProvider.OpenAI}
						modelId={settings.chatModelId}
						updateModel={updateChatModelId}
					/>

					<ComboBoxComponent
						name={t("settings.Models.autocompleteModel")}
						description={t("settings.Models.autocompleteModelDescription")}
						settings={settings}
						provider={settings.applyModelProvider || ApiProvider.OpenAI}
						modelId={settings.applyModelId}
						updateModel={updateApplyModelId}
					/>

					<ComboBoxComponent
						name={t("settings.Models.embeddingModel")}
						description={t("settings.Models.embeddingModelDescription")}
						settings={settings}
						provider={settings.embeddingModelProvider || ApiProvider.Google}
						modelId={settings.embeddingModelId}
						isEmbedding={true}
						updateModel={updateEmbeddingModelId}
					/>
				</div>
			</div>

			<style>
				{`
				/* 主容器样式 */
				.provider-settings-container {
					display: flex;
					flex-direction: column;
					gap: var(--size-4-6);
				}

				/* 区域样式 */
				.provider-config-section,
				.model-selection-section {
					background: var(--background-primary);
					border: 1px solid var(--background-modifier-border);
					border-radius: var(--radius-m);
					padding: var(--size-4-4);
				}

				/* 标题样式 */
				.section-title {
					font-size: var(--font-ui-medium);
					font-weight: var(--font-weight-semibold);
					color: var(--text-normal);
					margin: 0 0 var(--size-4-3) 0;
					padding-bottom: var(--size-2-2);
					border-bottom: 1px solid var(--background-modifier-border);
				}

				/* 提供商标签页容器 */
				.provider-tabs {
					display: flex;
					flex-wrap: wrap;
					gap: var(--size-2-2);
					margin-bottom: var(--size-4-4);
					padding-bottom: var(--size-4-3);
					border-bottom: 1px solid var(--background-modifier-border);
				}

				/* 提供商标签页按钮 */
				.provider-tab {
					padding: var(--size-2-2) var(--size-4-2);
					background: var(--background-secondary);
					border: 1px solid var(--background-modifier-border);
					border-radius: var(--radius-s);
					cursor: pointer;
					transition: all 0.15s ease-in-out;
					font-size: var(--font-ui-small);
					font-weight: var(--font-weight-medium);
					color: var(--text-muted);
					outline: none;
				}

				.provider-tab:hover {
					background: var(--background-modifier-hover);
					color: var(--text-normal);
				}

				.provider-tab.active {
					background: var(--interactive-accent);
					border-color: var(--interactive-accent);
					color: var(--text-on-accent);
					box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
					font-weight: var(--font-weight-semibold);
				}

				.provider-tab.active:hover {
					background: var(--interactive-accent-hover);
					border-color: var(--interactive-accent-hover);
				}

				/* 提供商配置内容 */
				.provider-config-content {
					min-height: 120px;
				}

				.provider-config {
					display: flex;
					flex-direction: column;
					gap: var(--size-4-2);
				}

				/* 模型选择器容器 */
				.model-selectors {
					display: flex;
					flex-direction: column;
					gap: var(--size-4-3);
				}

				/* 分隔线 */
				.setting-divider {
					height: 1px;
					background: var(--background-modifier-border);
					margin: var(--size-2-2) 0;
					opacity: 0.5;
				}

				/* 响应式设计 */
				@media (max-width: 768px) {
					.provider-settings-container {
						gap: var(--size-4-3);
					}
					
					.provider-config-section,
					.model-selection-section {
						padding: var(--size-4-2);
					}
					
					.provider-tabs {
						gap: var(--size-2-1);
					}
					
					.provider-tab {
						padding: var(--size-2-1) var(--size-4-1);
						font-size: var(--font-ui-smaller);
					}
				}

				/* 提供商名称高亮样式 */
				.provider-name-highlight {
					color: var(--interactive-accent);
					font-weight: var(--font-weight-medium);
				}

				/* API 链接样式 */
				.provider-api-link {
					color: var(--text-accent);
					text-decoration: underline;
				}

				.provider-api-link:hover {
					color: var(--text-accent-hover);
				}

				/* 深色模式适配 */
				.theme-dark .provider-tab {
					background: var(--background-secondary-alt);
				}

				.theme-dark .provider-tab:hover {
					background: var(--background-modifier-hover);
				}

				.theme-dark .provider-tab.active {
					background: var(--interactive-accent);
					color: var(--text-on-accent);
				}

				.theme-dark .provider-tab.active:hover {
					background: var(--interactive-accent-hover);
				}

				.theme-dark .provider-config-section,
				.theme-dark .model-selection-section {
					background: var(--background-primary-alt);
					border-color: var(--background-modifier-border-hover);
				}
				`}
			</style>
		</div>
	);
};

export default CustomProviderSettings;
