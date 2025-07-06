export function getFetchTasksDescription(): string {
	return `## fetch_tasks
Description:
This tool allows you to fetch tasks from your Obsidian vault using the Dataview plugin API. It retrieves tasks that have the "#task" tag across files and returns them in a structured format. This tool is always available and can be used to get an overview of tagged tasks in your vault with various filtering options.

Parameters:
- source: (optional) A Dataview source string to filter tasks. If not provided, fetches all tasks from the entire vault.
  - Examples: "#project" for tasks in files with #project tag, '"folder"' for tasks in specific folder
  - Default: fetches all tasks from the entire vault
- status: (optional) Filter tasks by completion status
  - "completed": Only completed tasks
  - "incomplete": Only incomplete/pending tasks  
  - "all": All tasks (default)
- completion: (optional) Filter tasks by completion date in YYYY-MM-DD format
  - Example: "2024-01-15" for tasks completed on January 15, 2024
- due: (optional) Filter tasks by due date in YYYY-MM-DD format
  - Example: "2024-01-15" for tasks due on January 15, 2024
- created: (optional) Filter tasks by creation date in YYYY-MM-DD format
  - Example: "2024-01-15" for tasks created on January 15, 2024
- start: (optional) Filter tasks by start date in YYYY-MM-DD format
  - Example: "2024-01-15" for tasks that can start on January 15, 2024
- scheduled: (optional) Filter tasks by scheduled date in YYYY-MM-DD format
  - Example: "2024-01-15" for tasks scheduled for January 15, 2024

Standard Date Fields:
The following date fields are supported with their emoji prefixes:
- due: 🗓️YYYY-MM-DD (Due date)
- completion: ✅YYYY-MM-DD (Completion date)
- created: ➕YYYY-MM-DD (Creation date)
- start: 🛫YYYY-MM-DD (Start date)
- scheduled: ⏳YYYY-MM-DD (Scheduled date)

Advanced Query Capabilities:
The AI can construct sophisticated Dataview queries by combining multiple conditions and using advanced date expressions. The AI can use ANY field name with ANY date expression in the source parameter.

Generic Date Field Examples:
- Overdue tasks: "due < date(today)"
- Tasks completed this week: "completion >= date(sow) AND completion <= date(eow)"
- Tasks started last month: "start >= date(som) - dur(1 month) AND start < date(som)"
- Tasks scheduled for next week: "scheduled >= date(sow) + dur(7 days) AND scheduled <= date(eow) + dur(7 days)"
- Tasks with custom deadline field: "deadline <= date(today) + dur(3 days)"
- Tasks with review date: "review >= date(today) AND review <= date(today) + dur(7 days)"

Date Comparison Examples:
- Overdue tasks: "due < date(today)"
- Tasks due soon (within 3 days): "due <= date(today) + dur(3 days)"
- Tasks due this week: "due >= date(sow) AND due <= date(eow)"
- Tasks completed this week: "completion >= date(sow) AND completion <= date(eow)"
- Tasks created last month: "created >= date(som) - dur(1 month) AND created < date(som)"
- Tasks due in the next 2 weeks: "due >= date(today) AND due <= date(today) + dur(14 days)"

Complex Filtering Examples:
- High priority incomplete tasks: "priority = high AND !completed"
- Tasks with specific tags: "contains(tags, "#urgent") AND !completed"
- Tasks in specific folders with due dates: "file.folder = "Work" AND due <= date(today) + dur(7 days)"
- Recently completed tasks: "completion >= date(today) - dur(7 days)"
- Tasks without due dates: "!due"
- Tasks with multiple conditions: "priority = high AND due <= date(today) + dur(3 days) AND !completed"

Relative Date Expressions (Dataview Literals):
- "date(today)" - Current date
- "date(now)" - Current date and time
- "date(tomorrow)" - Tomorrow's date
- "date(yesterday)" - Yesterday's date
- "date(sow)" - Start of current week
- "date(eow)" - End of current week
- "date(som)" - Start of current month
- "date(eom)" - End of current month
- "date(soy)" - Start of current year
- "date(eoy)" - End of current year
- "date(2024-01-15)" - Specific date
- "date(2024-09-20T20:17)" - Specific date and time

Duration Expressions:
- "dur(1 day)" - One day
- "dur(3 days)" - Three days
- "dur(1 week)" - One week
- "dur(2 weeks)" - Two weeks
- "dur(1 month)" - One month
- "dur(3 months)" - Three months
- "dur(1 year)" - One year
- "dur(1 h 30 m)" - One hour and thirty minutes
- "dur(2 days 4 hours)" - Two days and four hours

Usage Examples:

Basic usage:
<fetch_tasks>
<source>
#project
</source>
</fetch_tasks>

Filter by status:
<fetch_tasks>
<source>
#todo
</source>
<status>
completed
</status>
</fetch_tasks>

Filter by completion date:
<fetch_tasks>
<completion>
2024-01-15
</completion>
</fetch_tasks>

Filter by due date:
<fetch_tasks>
<due>
2024-01-20
</due>
</fetch_tasks>

Multiple filters:
<fetch_tasks>
<source>
#work
</source>
<status>
incomplete
</status>
<due>
2024-01-31
</due>
</fetch_tasks>

Advanced Examples:

Overdue tasks:
<fetch_tasks>
<source>
due < date(today)
</source>
<status>
incomplete
</status>
</fetch_tasks>

Tasks due this week:
<fetch_tasks>
<source>
due >= date(sow) AND due <= date(eow)
</source>
<status>
incomplete
</status>
</fetch_tasks>

Tasks due soon (next 3 days):
<fetch_tasks>
<source>
due >= date(today) AND due <= date(today) + dur(3 days)
</source>
<status>
incomplete
</status>
</fetch_tasks>

High priority tasks:
<fetch_tasks>
<source>
priority = high
</source>
<status>
incomplete
</status>
</fetch_tasks>

Recently completed tasks:
<fetch_tasks>
<source>
completion >= date(today) - dur(7 days)
</source>
<status>
completed
</status>
</fetch_tasks>

Tasks created this month:
<fetch_tasks>
<source>
created >= date(som)
</source>
</fetch_tasks>

Tasks with custom deadline field:
<fetch_tasks>
<source>
deadline <= date(today) + dur(5 days)
</source>
<status>
incomplete
</status>
</fetch_tasks>

Tasks scheduled for next week:
<fetch_tasks>
<source>
scheduled >= date(sow) + dur(7 days) AND scheduled <= date(eow) + dur(7 days)
</source>
</fetch_tasks>

Tasks started last month:
<fetch_tasks>
<source>
start >= date(som) - dur(1 month) AND start < date(som)
</source>
</fetch_tasks>

Tasks with start dates this week:
<fetch_tasks>
<source>
start >= date(sow) AND start <= date(eow)
</source>
</fetch_tasks>

Note: This tool uses the Dataview plugin API to access task data. The Dataview plugin must be installed and enabled for this tool to work. The AI can construct sophisticated queries using Dataview's query language to filter tasks based on complex conditions, date ranges, and custom fields. Date literals follow the official Dataview specification. The AI can use ANY field name with ANY date expression in the source parameter for maximum flexibility. Standard date fields (due, completion, created, start, scheduled) can be used with their emoji prefixes in task metadata.
`
} 