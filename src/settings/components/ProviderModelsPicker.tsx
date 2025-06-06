import * as Popover from "@radix-ui/react-popover";
import Fuse, { FuseResult } from "fuse.js";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { ApiProvider } from "../../types/llm/model";
import { InfioSettings } from "../../types/settings";
// import { PROVIDERS } from '../constants';
import { GetAllProviders, GetEmbeddingProviderModelIds, GetEmbeddingProviders, GetProviderModelIds } from "../../utils/api";

type TextSegment = {
	text: string;
	isHighlighted: boolean;
};

type SearchableItem = {
	id: string;
	html: string | TextSegment[];
};

type HighlightedItem = {
	id: string;
	html: TextSegment[];
};

// Type guard for Record<string, unknown>
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

// https://gist.github.com/evenfrost/1ba123656ded32fb7a0cd4651efd4db0
export const highlight = (fuseSearchResult: FuseResult<SearchableItem>[]): HighlightedItem[] => {
	const set = (obj: Record<string, unknown>, path: string, value: TextSegment[]): void => {
		const pathValue = path.split(".")
		let i: number
		let current = obj

		for (i = 0; i < pathValue.length - 1; i++) {
			const nextValue = current[pathValue[i]]
			if (isRecord(nextValue)) {
				current = nextValue
			} else {
				throw new Error(`Invalid path: ${path}`)
			}
		}

		current[pathValue[i]] = value
	}

	// Function to merge overlapping regions
	const mergeRegions = (regions: [number, number][]): [number, number][] => {
		if (regions.length === 0) return regions

		// Sort regions by start index
		regions.sort((a, b) => a[0] - b[0])

		const merged: [number, number][] = [regions[0]]

		for (let i = 1; i < regions.length; i++) {
			const last = merged[merged.length - 1]
			const current = regions[i]

			if (current[0] <= last[1] + 1) {
				// Overlapping or adjacent regions
				last[1] = Math.max(last[1], current[1])
			} else {
				merged.push(current)
			}
		}

		return merged
	}

	const generateHighlightedSegments = (inputText: string, regions: [number, number][] = []): TextSegment[] => {
		if (regions.length === 0) {
			return [{ text: inputText, isHighlighted: false }];
		}

		// Sort and merge overlapping regions
		const mergedRegions = mergeRegions(regions);
		const segments: TextSegment[] = [];
		let nextUnhighlightedRegionStartingIndex = 0;

		mergedRegions.forEach((region) => {
			const start = region[0];
			const end = region[1];
			const lastRegionNextIndex = end + 1;

			// Add unhighlighted segment before the highlight
			if (nextUnhighlightedRegionStartingIndex < start) {
				segments.push({
					text: inputText.substring(nextUnhighlightedRegionStartingIndex, start),
					isHighlighted: false,
				});
			}

			// Add highlighted segment
			segments.push({
				text: inputText.substring(start, lastRegionNextIndex),
				isHighlighted: true,
			});

			nextUnhighlightedRegionStartingIndex = lastRegionNextIndex;
		});

		// Add remaining unhighlighted text
		if (nextUnhighlightedRegionStartingIndex < inputText.length) {
			segments.push({
				text: inputText.substring(nextUnhighlightedRegionStartingIndex),
				isHighlighted: false,
			});
		}

		return segments;
	}

	return fuseSearchResult
		.filter(({ matches }) => matches && matches.length)
		.map(({ item, matches }): HighlightedItem => {
			const highlightedItem: HighlightedItem = {
				id: item.id,
				html: typeof item.html === 'string' ? [{ text: item.html, isHighlighted: false }] : [...item.html]
			}

			matches?.forEach((match) => {
				if (match.key && typeof match.value === "string" && match.indices) {
					const mergedIndices = mergeRegions([...match.indices])
					set(highlightedItem, match.key, generateHighlightedSegments(match.value, mergedIndices))
				}
			})

			return highlightedItem
		})
}

const HighlightedText: React.FC<{ segments: TextSegment[] }> = ({ segments }) => {
	return (
		<>
			{segments.map((segment, index) => (
				segment.isHighlighted ? (
					<span key={index} className="infio-llm-setting-model-item-highlight">{segment.text}</span>
				) : (
					<span key={index}>{segment.text}</span>
				)
			))}
		</>
	);
};

export type ComboBoxComponentProps = {
	name: string;
	provider: ApiProvider;
	modelId: string;
	settings?: InfioSettings | null;
	isEmbedding?: boolean,
	updateModel: (provider: ApiProvider, modelId: string) => void;
};

export const ComboBoxComponent: React.FC<ComboBoxComponentProps> = ({
	name,
	provider,
	modelId,
	settings = null,
	isEmbedding = false,
	updateModel,
}) => {
	// provider state
	const [modelProvider, setModelProvider] = useState(provider);

	// search state
	const [searchTerm, setSearchTerm] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(0);

	const providers = isEmbedding ? GetEmbeddingProviders() : GetAllProviders()

	const [modelIds, setModelIds] = useState<string[]>([]);

	// Replace useMemo with useEffect for async fetching
	useEffect(() => {
		const fetchModelIds = async () => {
			const ids = isEmbedding
				? GetEmbeddingProviderModelIds(modelProvider)
				: await GetProviderModelIds(modelProvider, settings);
			setModelIds(ids);
		};

		fetchModelIds();
	}, [modelProvider, isEmbedding, settings]);

	const searchableItems = useMemo(() => {
		return modelIds.map((id) => ({
			id,
			html: id,
		}))
	}, [modelIds])

	// fuse, used for fuzzy search, simple configuration threshold can be adjusted as needed
	const fuse: Fuse<SearchableItem> = useMemo(() => {
		return new Fuse<SearchableItem>(searchableItems, {
			keys: ["html"],
			threshold: 0.6,
			shouldSort: true,
			isCaseSensitive: false,
			ignoreLocation: false,
			includeMatches: true,
			minMatchCharLength: 1,
		})
	}, [searchableItems])

	// 根据 searchTerm 得到过滤后的数据列表
	const filteredOptions = useMemo(() => {
		const results: HighlightedItem[] = searchTerm
			? highlight(fuse.search(searchTerm))
			: searchableItems.map(item => ({
				...item,
				html: typeof item.html === 'string' ? [{ text: item.html, isHighlighted: false }] : item.html
			}))
		return results
	}, [searchableItems, searchTerm, fuse])

	const listRef = useRef<HTMLDivElement>(null);
	const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

	// when selected index changes, scroll to visible area
	useEffect(() => {
		if (itemRefs.current[selectedIndex]) {
			itemRefs.current[selectedIndex]?.scrollIntoView({
				block: "nearest",
				behavior: "smooth"
			});
		}
	}, [selectedIndex]);

	return (
		<div className="infio-llm-setting-item">
			<div className="infio-llm-setting-item-name">{name}</div>
			<Popover.Root modal={false} open={isOpen} onOpenChange={setIsOpen}>
				<Popover.Trigger asChild>
					<div className="infio-llm-setting-item-control">
						<span className="infio-llm-setting-model-id">[{modelProvider}]&nbsp;{modelId}</span>
					</div>
				</Popover.Trigger>
				<Popover.Content
					side="bottom"
					align="start"
					sideOffset={4}
					className="infio-llm-setting-combobox-dropdown"
				>
					<div ref={listRef}>
						<div className="infio-llm-setting-search-container">
							<select
								className="infio-llm-setting-provider-switch"
								value={modelProvider}
								onChange={(e) => setModelProvider(e.target.value as ApiProvider)}
							>
								{providers.map((provider) => (
									<option
										key={provider}
										value={provider}
										className={`infio-llm-setting-provider-option ${provider === modelProvider ? 'is-active' : ''}`}
									>
										{provider}
									</option>
								))}
							</select>
							{modelIds.length > 0 ? (
								<input
									type="text"
									className="infio-llm-setting-item-search"
									placeholder="search model..."
									value={searchTerm}
									onChange={(e) => {
										setSearchTerm(e.target.value);
										setSelectedIndex(0);
									}}
									onKeyDown={(e) => {
										switch (e.key) {
											case "ArrowDown":
												e.preventDefault();
												setSelectedIndex((prev) =>
													Math.min(prev + 1, filteredOptions.length - 1)
												);
												break;
											case "ArrowUp":
												e.preventDefault();
												setSelectedIndex((prev) => Math.max(prev - 1, 0));
												break;
											case "Enter": {
												e.preventDefault();
												const selectedOption = filteredOptions[selectedIndex];
												if (selectedOption) {
													updateModel(modelProvider, selectedOption.id);
													setSearchTerm("");
													setIsOpen(false);
												}
												break;
											}
											case "Escape":
												e.preventDefault();
												setIsOpen(false);
												setSearchTerm("");
												break;
										}
									}}
								/>
							) : (
									<input
										type="text"
										className="infio-llm-setting-item-search"
										placeholder="input custom model name"
										value={searchTerm}
										onChange={(e) => {
											setSearchTerm(e.target.value);
										}}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												updateModel(modelProvider, searchTerm);
												setIsOpen(false);
											}
										}}
									/>
							)}
						</div>
						{filteredOptions.map((option, index) => (
							<Popover.Close key={option.id} asChild>
								<div
									ref={(el) => (itemRefs.current[index] = el)}
									onMouseEnter={() => setSelectedIndex(index)}
									onClick={() => {
										updateModel(modelProvider, option.id);
										setSearchTerm("");
										setIsOpen(false);
									}}
									className={`infio-llm-setting-combobox-option ${index === selectedIndex ? 'is-selected' : ''}`}
								>
									<HighlightedText segments={option.html} />
								</div>
							</Popover.Close>
						))}
					</div>
				</Popover.Content>
			</Popover.Root>
		</div>
	);
};
