import React, { useMemo, useState } from 'react';

import { t } from '../../lang/helpers';
import InfioPlugin from "../../main";
import { ApiProvider } from '../../types/llm/model';
import { InfioSettings } from '../../types/settings';
import { GetAllProviders } from '../../utils/api';

import { DropdownComponent, TextComponent, ToggleComponent } from './FormComponents';
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
	const [currProvider, setCurrProvider] = useState(settings.defaultProvider);

	const handleSettingsUpdate = async (newSettings: InfioSettings) => {
		await plugin.setSettings(newSettings);
		// Use the callback function passed from the parent component to refresh the entire container
		onSettingsUpdate?.();
	};

	const providerSetting = useMemo(() => {
		const providerKey = getProviderSettingKey(currProvider);
		return settings[providerKey] || {};
	}, [currProvider, settings]);

	const providers = GetAllProviders();

	const updateProvider = (provider: ApiProvider) => {
		setCurrProvider(provider);
		handleSettingsUpdate({
			...settings,
			defaultProvider: provider
		});
	};

	const updateProviderApiKey = (value: string) => {
		const providerKey = getProviderSettingKey(currProvider);
		const providerSettings = settings[providerKey];

		handleSettingsUpdate({
			...settings,
			[providerKey]: {
				...providerSettings,
				apiKey: value
			}
		});
	};

	const updateProviderUseCustomUrl = (value: boolean) => {
		const providerKey = getProviderSettingKey(currProvider);
		const providerSettings = settings[providerKey];

		handleSettingsUpdate({
			...settings,
			[providerKey]: {
				...providerSettings,
				useCustomUrl: value
			}
		});
	};

	const updateProviderBaseUrl = (value: string) => {
		const providerKey = getProviderSettingKey(currProvider);
		const providerSettings = settings[providerKey];

		handleSettingsUpdate({
			...settings,
			[providerKey]: {
				...providerSettings,
				baseUrl: value
			}
		});
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

	return (
		<div className="infio-llm-setting-provider">
			<DropdownComponent
				name={t("settings.ApiProvider.label")}
				value={currProvider}
				options={providers}
				onChange={updateProvider}
			/>
			<div className="infio-llm-setting-divider"></div>
			{currProvider !== ApiProvider.Ollama && (
				<TextComponent
					name={currProvider + " api key:"}
					placeholder={t("settings.ApiProvider.enterApiKey")}
					value={providerSetting.apiKey || ''}
					onChange={updateProviderApiKey}
					type="password"
				/>
			)}
			<div className="infio-llm-setting-divider"></div>
			<ToggleComponent
				name={t("settings.ApiProvider.useCustomBaseUrl")}
				value={providerSetting.useCustomUrl || false}
				onChange={updateProviderUseCustomUrl}
			/>
			{providerSetting.useCustomUrl && (
				<TextComponent
					placeholder={t("settings.ApiProvider.enterCustomUrl")}
					value={providerSetting.baseUrl || ''}
					onChange={updateProviderBaseUrl}
				/>
			)}

			<div className="infio-llm-setting-divider"></div>
			<div className="infio-llm-setting-divider"></div>
			<ComboBoxComponent
				name={t("settings.Models.chatModel")}
				settings={settings}
				provider={settings.chatModelProvider || currProvider}
				modelId={settings.chatModelId}
				updateModel={updateChatModelId}
			/>
			<div className="infio-llm-setting-divider"></div>
			<ComboBoxComponent
				name={t("settings.Models.autocompleteModel")}
				settings={settings}
				provider={settings.applyModelProvider || currProvider}
				modelId={settings.applyModelId}
				updateModel={updateApplyModelId}
			/>
			<div className="infio-llm-setting-divider"></div>
			<ComboBoxComponent
				name={t("settings.Models.embeddingModel")}
				settings={settings}
				provider={settings.embeddingModelProvider || ApiProvider.Google}
				modelId={settings.embeddingModelId}
				isEmbedding={true}
				updateModel={updateEmbeddingModelId}
			/>
			<div className="infio-llm-setting-divider"></div>
			<div className="infio-llm-setting-divider"></div>
		</div>
	);
};

export default CustomProviderSettings;
