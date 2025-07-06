# Fetch Tasks Tool

This tool allows you to fetch all tasks from your Obsidian vault using the Dataview plugin API. It's always available and can be used to get an overview of all tasks in your vault.

## Features

- **Always Available**: This tool is always available in all modes
- **Filter by Source**: Can filter tasks by Dataview source (tags, folders, etc.)
- **Complete Task Information**: Shows task status, file location, and task text
- **Dataview Integration**: Uses the Dataview plugin API for reliable task access

## Usage

### Basic Usage (All Tasks)
```
<fetch_tasks>
</fetch_tasks>
```

### Filtered Usage
```
<fetch_tasks>
<source>
#project
</source>
</fetch_tasks>
```

### Examples

1. **Get all tasks from files with #todo tag:**
```
<fetch_tasks>
<source>
#todo
</source>
</fetch_tasks>
```

2. **Get all tasks from a specific folder:**
```
<fetch_tasks>
<source>
"Daily Notes"
</source>
</fetch_tasks>
```

3. **Get all tasks from files with multiple tags:**
```
<fetch_tasks>
<source>
#project or #work
</source>
</fetch_tasks>
```

## Parameters

- **source** (optional): A Dataview source string to filter tasks
  - Examples: `#project`, `"folder"`, `#yes or -#no`
  - If not provided, fetches all tasks from the entire vault

## Output Format

The tool returns tasks in the following format:
```
✅ [[File Name]] - Completed task text
⬜ [[File Name]] - Incomplete task text
```

Where:
- ✅ indicates a completed task
- ⬜ indicates an incomplete task
- `[[File Name]]` is the file containing the task
- Task text shows the actual task content

## Requirements

- **Dataview Plugin**: Must be installed and enabled in Obsidian
- **Task Format**: Tasks must be in standard Obsidian task format (`- [ ]` or `- [x]`)

## Implementation Details

The tool uses the Dataview plugin API to:
1. Access the Dataview plugin through `app.plugins.plugins.dataview`
2. Use `dataviewApi.pages(source)` to get filtered pages
3. Extract tasks using `pages.file.tasks`
4. Format tasks with completion status and file links

## Error Handling

- If Dataview plugin is not found: "Dataview plugin not found or API not available"
- If no tasks are found: Returns "Found 0 tasks" with empty list
- If source is invalid: Dataview will handle the error appropriately

## Integration

This tool is integrated into the note-copilot plugin and is available in:
- All chat modes
- All custom modes
- Always available regardless of mode settings 