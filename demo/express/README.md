# MCP Agent Express Demo

A simple REST API demo using Express.js with TypeScript that manages a task list.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Build TypeScript files
npm run build

# Production mode (requires build first)
npm start

# Watch mode (automatically rebuilds on changes)
npm run watch
```

The server will start on port 3000 by default. You can change this by setting the `PORT` environment variable.

## Project Structure
```
src/
├── types/          # TypeScript type definitions
│   └── task.ts     # Task-related types
└── index.ts        # Main application file
```

## API Endpoints

### Health Check
- `GET /api/health` - Check API health status

### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get a specific task by ID
- `POST /api/tasks` - Create a new task
  ```json
  {
    "title": "Your task title"
  }
  ```
- `PUT /api/tasks/:id` - Update a task
  ```json
  {
    "title": "Updated title",
    "completed": true
  }
  ```
- `DELETE /api/tasks/:id` - Delete a task

## Example Usage

```bash
# Get all tasks
curl http://localhost:3000/api/tasks

# Create a new task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "New task"}'

# Update a task
curl -X PUT http://localhost:3000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'

# Delete a task
curl -X DELETE http://localhost:3000/api/tasks/1
``` 