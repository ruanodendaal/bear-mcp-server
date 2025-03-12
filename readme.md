# Bear Notes MCP Server

This is a Model Context Protocol (MCP) server that connects to your Bear Notes database, allowing AI assistants to search and retrieve your notes.

## Installation

Clone this repository and install dependencies:

```bash
git clone [your-repo-url]
cd bear-mcp-server
npm install
```

Make the server executable:

```bash
chmod +x src/bear-mcp-server.js
```

## Configuration

Update your MCP configuration file to include the Bear Notes server:

```json
{
  "mcpServers": {
    "bear-notes": {
      "command": "node",
      "args": [
        "/absolute/path/to/bear-mcp-server/src/bear-mcp-server.js"
      ],
      "env": {
        "BEAR_DATABASE_PATH": "/Users/yourusername/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite"
      }
    }
  }
}
```

Replace `/absolute/path/to/bear-mcp-server` with the actual path to your installation.

## Features

- **Search Notes**: Search through your Bear Notes by title and content
- **Retrieve Full Notes**: Get complete note content including metadata
- **Tag Support**: Access tags associated with each note and list all available tags
- **Integration with AI Assistants**: Seamlessly connect your notes to MCP-compatible AI assistants

## Available Tools

This MCP server provides the following tools that can be used by AI assistants:

1. **search_notes**: Search for notes in Bear that match a query
   - Required parameter: `query` (string)
   - Optional parameter: `limit` (number, default: 10)

2. **get_note**: Retrieve a specific note by its ID
   - Required parameter: `id` (string)

3. **get_tags**: Get a list of all tags used in your Bear Notes

## How It Works

This server:

1. Connects to your Bear Notes SQLite database in read-only mode
2. Exposes MCP tools for interacting with your notes
3. Uses stdio transport for seamless integration with MCP clients
4. Automatically starts and stops with the MCP client

## Database Schema

The server works with Bear's SQLite database schema, including:

- `ZSFNOTE`: Main notes table
- `ZSFNOTETAG`: Note tags
- `Z_7TAGS`: Tag relationships

## Requirements

- Node.js version 14 or higher
- Bear Notes for macOS
- An MCP-compatible AI assistant client

## Limitations

- Read-only access to your Bear Notes
- Only works with Bear Notes on macOS
- Cannot create or modify notes

## Troubleshooting

If you encounter issues:

1. Ensure the database path is correct
2. Check permissions on the Bear Notes database
3. Verify the server script is executable
4. Look for error messages in the MCP client logs

## License

MIT