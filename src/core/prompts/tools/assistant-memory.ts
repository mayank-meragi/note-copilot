import { ToolArgs } from "./types"

export function getAssistantMemoryDescription(args: ToolArgs): string {
	return `## assistant_memory
Description: Write the complete updated memory content to the assistant memory file (assistant-memory.md). This tool is used to store information about the user that should be remembered across conversations.

CRITICAL: The memory file is automatically read and included in every conversation, so you already have access to the existing memory content. When using this tool:

1. Review the existing memory content (already available in the conversation)
2. Decide what information to add, modify, or remove
3. Provide the COMPLETE updated memory content (not just additions)

This ensures the memory stays organized and avoids duplication or contradictions.

Parameters:
- content: (required) The complete updated memory content. This should be the full memory file content, not just additions.

Usage:
<assistant_memory>
<content>
# User Memory

## Communication Preferences
- Prefers professional communication style
- Likes concise explanations

## Work Preferences
- Prefers simple, straightforward solutions
- Values simplicity over complexity

## Recent Context
- Working on AI assistant memory functionality
- Testing memory writing capabilities
</content>
</assistant_memory>

Example: When you learn the user prefers simple solutions
<assistant_memory>
<content>
# User Memory

## Work Preferences
- Prefers simple, straightforward solutions
- Values simplicity over complexity
- Appreciates clean, minimal approaches

## Communication Preferences
- Likes concise explanations
- Prefers direct communication
</content>
</assistant_memory>

IMPORTANT: Always provide the complete memory content, not just additions. The AI should merge new information with existing information and provide the full updated content.`
} 