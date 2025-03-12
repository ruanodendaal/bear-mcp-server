#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { getDbPath, createDb, searchNotes, retrieveNote, getAllTags } from './utils.js';

// Initialize database connection
const dbPath = getDbPath();
const db = createDb(dbPath);

// Create MCP server
const server = new Server(
  {
    name: 'bear-notes',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    }
  }
);

// Register the list tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_notes',
        description: 'Search for notes in Bear that match a query',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to find matching notes',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_note',
        description: 'Retrieve a specific note by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier of the note to retrieve',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_tags',
        description: 'Get all tags used in Bear Notes',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      }
    ],
  };
});

// Register the call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'search_notes') {
    const { query, limit = 10 } = request.params.arguments;
    const notes = await searchNotes(db, query, limit);
    return { toolResult: { notes } };
  }
  
  if (request.params.name === 'get_note') {
    const { id } = request.params.arguments;
    const note = await retrieveNote(db, id);
    return { toolResult: { note } };
  }
  
  if (request.params.name === 'get_tags') {
    const tags = await getAllTags(db);
    return { toolResult: { tags } };
  }
  
  throw new McpError(ErrorCode.MethodNotFound, 'Tool not found');
});

// Use stdio transport instead of HTTP
const transport = new StdioServerTransport();

// Start the server with stdio transport
await server.connect(transport);

// Handle process termination
['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(signal => {
  process.on(signal, () => {
    console.error(`Received ${signal}, shutting down Bear Notes MCP server...`);
    db.close(() => {
      console.error('Database connection closed.');
      process.exit(0);
    });
  });
});

// Important: Log to stderr for debugging, not stdout
console.error('Bear Notes MCP server ready');