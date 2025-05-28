# Bear Notes MCP Server with RAG

Looking to supercharge your Bear Notes experience with AI assistants? This little gem connects your personal knowledge base to AI systems using semantic search and RAG (Retrieval-Augmented Generation).

I built this because I wanted my AI assistants to actually understand what's in my notes, not just perform simple text matching. The result is rather sweet, if I do say so myself.

## Getting Started

Setting up is straightforward:

```bash
git clone [your-repo-url]
cd bear-mcp-server
npm install

Make the scripts executable (because permissions matter):

chmod +x src/bear-mcp-server.js
chmod +x src/create-index.js

First Things First: Index Your Notes

Before diving in, you’ll need to create vector embeddings of your notes:

npm run index

Fair warning: this might take a few minutes if you’re a prolific note-taker like me. It’s converting all your notes into mathematical vectors that capture their meaning, clever stuff 😉.

Configuration

Update your MCP configuration file:

{
  "mcpServers": {
    "bear-notes": {
      "command": "node",
      "args": [
        "/absolute/path/to/bear-mcp-server/src/bear-mcp-server.js"
      ],
      "env": {
        "BEAR_DATABASE_PATH": "/Users/yourusername/Library/Group Containers/9K33E3U3T4.net.shinyfrog.net.bear/Application Data/database.sqlite"
      }
    }
  }
}

🚨 Remember to replace the path with your actual installation location. No prizes for using the example path verbatim, I’m afraid.

What Makes This Special?
	•	Semantic Search: Find notes based on meaning, not just keywords. Ask about “productivity systems” and it’ll find your notes on GTD and Pomodoro, even if they don’t contain those exact words.
	•	RAG Support: Your AI assistants can now pull in relevant context from your notes, even when you haven’t explicitly mentioned them.
	•	All Local Processing: Everything runs on your machine. No data leaves your computer, no API keys needed, no internet dependency (after initial setup).
	•	Graceful Fallbacks: If semantic search isn’t available for whatever reason, it’ll quietly fall back to traditional search. Belt and braces.

How It Works

The Clever Bits

This server uses the Xenova implementation of transformers.js with the all-MiniLM-L6-v2 model:
	•	It creates 384-dimensional vectors that capture the semantic essence of your notes
	•	All processing happens locally on your machine
	•	The first startup might be a tad slow while the model loads, but it’s zippy after that

The Flow
	1.	Your query gets converted into a vector using the transformer model
	2.	This vector is compared to the pre-indexed vectors of your notes
	3.	Notes with similar meanings are returned, regardless of exact keyword matches
	4.	AI assistants use these relevant notes as context for their responses

Project Structure

Nothing too complex here:

bear-mcp-server/
├── package.json
├── readme.md
└── src/
    ├── bear-mcp-server.js     # Main MCP server
    ├── create-index.js        # Script to index notes
    ├── utils.js               # Utility functions
    ├── lib/                   # Additional utilities and diagnostic scripts
    │   └── explore-database.js # Database exploration and diagnostic tool
    ├── note_vectors.index     # Generated vector index (after indexing)
    └── note_vectors.json      # Note ID mapping (after indexing)

Available Tools for AI Assistants

AI assistants connecting to this server can use these tools:
	1.	search_notes: Find notes that match a query
	•	Parameters: query (required), limit (optional, default: 10), semantic (optional, default: true)
	2.	get_note: Fetch a specific note by its ID
	•	Parameters: id (required)
	3.	get_tags: List all tags used in your Bear Notes
	4.	retrieve_for_rag: Get notes semantically similar to a query, specifically formatted for RAG
	•	Parameters: query (required), limit (optional, default: 5)

Requirements
	•	Node.js version 16 or higher
	•	Bear Notes for macOS
	•	An MCP-compatible AI assistant client

Limitations & Caveats
	•	Read-only access to Bear Notes (we’re not modifying your precious notes)
	•	macOS only (sorry Windows and Linux folks)
	•	If you add loads of new notes, you’ll want to rebuild the index with npm run index
	•	First startup is a bit like waiting for the kettle to boil while the embedding model loads

Troubleshooting

If things go wonky:
	1.	Double-check your Bear database path
	2.	Make sure you’ve run the indexing process with npm run index
	3.	Check permissions on the Bear Notes database
	4.	Verify the server scripts are executable
	5.	Look for error messages in the logs

When in doubt, try turning it off and on again. Works more often than we’d like to admit.

🐳 Running with Docker (Optional)

Prefer containers? You can run everything inside Docker too.

1. Build the Docker image

docker build -t bear-mcp-server .

2. Index your notes

You’ll still need to run the indexing step before anything useful happens:

docker run \
  -v /path/to/your/NoteDatabase.sqlite:/app/database.sqlite \
  -e BEAR_DATABASE_PATH=/app/database.sqlite \
  bear-mcp-server \
  npm run index

🛠 Replace /path/to/your/NoteDatabase.sqlite with the actual path to your Bear database.

3. Start the server

Once indexed, fire it up:

docker run \
  -v /path/to/your/NoteDatabase.sqlite:/app/database.sqlite \
  -e BEAR_DATABASE_PATH=/app/database.sqlite \
  -p 8000:8000 \
  bear-mcp-server

Boom—your AI assistant is now running in a container and talking to your notes.

License

MIT (Feel free to tinker, share, and improve)