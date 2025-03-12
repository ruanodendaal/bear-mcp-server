import sqlite3 from 'sqlite3';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

// Get current file path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup SQLite with verbose mode
const sqlite = sqlite3.verbose();
const { Database } = sqlite;

// Default path to Bear's database
const defaultDBPath = path.join(
  os.homedir(),
  'Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite'
);

// Get the database path from environment variable or use default
export const getDbPath = () => process.env.BEAR_DATABASE_PATH || defaultDBPath;

// Create and configure database connection
export const createDb = (dbPath) => {
  const db = new Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('Error connecting to Bear database:', err.message);
      process.exit(1);
    }
    console.error('Connected to Bear Notes database at:', dbPath);
  });

  // Promisify database methods
  db.allAsync = promisify(db.all).bind(db);
  db.getAsync = promisify(db.get).bind(db);
  
  return db;
};

// Search for notes matching a query
export const searchNotes = async (db, query, limit = 10) => {
  try {
    // Search for notes that match the query
    const notes = await db.allAsync(`
      SELECT 
        ZUNIQUEIDENTIFIER as id,
        ZTITLE as title,
        ZTEXT as content,
        ZSUBTITLE as subtitle,
        ZCREATIONDATE as creation_date
      FROM ZSFNOTE
      WHERE ZTRASHED = 0 AND (ZTITLE LIKE ? OR ZTEXT LIKE ?)
      ORDER BY ZMODIFICATIONDATE DESC
      LIMIT ?
    `, [`%${query}%`, `%${query}%`, limit]);
    
    // Get tags for each note
    for (const note of notes) {
      const tags = await db.allAsync(`
        SELECT ZT.ZTITLE as tag_name
        FROM Z_7TAGS ZNT
        JOIN ZSFNOTETAG ZT ON ZT.Z_PK = ZNT.Z_14TAGS
        JOIN ZSFNOTE ZN ON ZN.Z_PK = ZNT.Z_7NOTES
        WHERE ZN.ZUNIQUEIDENTIFIER = ?
      `, [note.id]);
      
      note.tags = tags.map(t => t.tag_name);
      
      // Convert Apple's timestamp (seconds since 2001-01-01) to standard timestamp
      if (note.creation_date) {
        // Apple's reference date is 2001-01-01, so add seconds to get UNIX timestamp
        note.creation_date = new Date((note.creation_date + 978307200) * 1000).toISOString();
      }
    }
    
    return notes;
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
};

// Retrieve a specific note by ID
export const retrieveNote = async (db, id) => {
  try {
    if (!id) {
      throw new Error('Note ID is required');
    }
    
    // Get the note by ID
    const note = await db.getAsync(`
      SELECT 
        ZUNIQUEIDENTIFIER as id,
        ZTITLE as title,
        ZTEXT as content,
        ZSUBTITLE as subtitle,
        ZCREATIONDATE as creation_date
      FROM ZSFNOTE
      WHERE ZUNIQUEIDENTIFIER = ? AND ZTRASHED = 0
    `, [id]);
    
    if (!note) {
      throw new Error('Note not found');
    }
    
    // Get tags for the note
    const tags = await db.allAsync(`
      SELECT ZT.ZTITLE as tag_name
      FROM Z_7TAGS ZNT
      JOIN ZSFNOTETAG ZT ON ZT.Z_PK = ZNT.Z_14TAGS
      JOIN ZSFNOTE ZN ON ZN.Z_PK = ZNT.Z_7NOTES
      WHERE ZN.ZUNIQUEIDENTIFIER = ?
    `, [note.id]);
    
    note.tags = tags.map(t => t.tag_name);
    
    // Convert Apple's timestamp (seconds since 2001-01-01) to standard timestamp
    if (note.creation_date) {
      // Apple's reference date is 2001-01-01, so add seconds to get UNIX timestamp
      note.creation_date = new Date((note.creation_date + 978307200) * 1000).toISOString();
    }
    
    return note;
  } catch (error) {
    console.error('Retrieve error:', error);
    throw error;
  }
};

// Get all tags
export const getAllTags = async (db) => {
  try {
    const tags = await db.allAsync('SELECT ZTITLE as name FROM ZSFNOTETAG');
    return tags.map(tag => tag.name);
  } catch (error) {
    console.error('Get tags error:', error);
    throw error;
  }
};