# Test Assistant Memory Tool

This file contains test commands to verify that the assistant memory tool is working correctly.

## Test Commands

Copy and paste these commands into the chat to test the assistant memory functionality:

### 1. Test Read Operation
```
<assistant_memory>
<action>read</action>
</assistant_memory>
```

### 2. Test Write Operation
```
<assistant_memory>
<action>write</action>
<content>
# Assistant Memory

## User Information
- Name: Test User
- Role: Developer
- Preferences: Clean code, good documentation

## Work Context
- Working on Obsidian plugin development
- Uses TypeScript and React
- Prefers modular architecture

## Communication Style
- Prefers direct, concise responses
- Appreciates code examples
- Values clear explanations

## Recent Activities
- Implementing assistant memory feature
- Testing tool functionality
- Debugging file creation issues
</content>
</assistant_memory>
```

### 3. Test Read Again (to verify write worked)
```
<assistant_memory>
<action>read</action>
</assistant_memory>
```

## Expected Behavior

1. **First read**: Should show default message about no memory file found
2. **Write**: Should create `assistant-memory.md` file in vault root
3. **Second read**: Should show the content that was written

## Debug Information

Check the browser console (F12) for debug logs that will show:
- When the tool is called
- File path being used
- Whether file exists
- Creation/modification attempts
- Any errors that occur

## Troubleshooting

If the file isn't being created:
1. Check console logs for errors
2. Verify the tool is being called
3. Check if the file path is correct
4. Ensure the vault has write permissions 