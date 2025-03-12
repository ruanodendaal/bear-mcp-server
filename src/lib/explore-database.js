#!/usr/bin/env node

import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import os from 'os';

// Default path to Bear's database
const defaultDBPath = path.join(
  os.homedir(),
  'Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite'
);

// Get the database path from environment variable or use default
const dbPath = process.env.BEAR_DATABASE_PATH || defaultDBPath;

console.log(`Examining Bear database at: ${dbPath}`);

// Connect to the database
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error connecting to Bear database:', err.message);
    process.exit(1);
  }
  console.log('Connected to Bear Notes database successfully');
});

// Promisify database methods
db.allAsync = promisify(db.all).bind(db);
db.getAsync = promisify(db.get).bind(db);

async function examineDatabase() {
  try {
    // List all tables in the database
    const tables = await db.allAsync(`
      SELECT name FROM sqlite_master 
      WHERE type='table'
      ORDER BY name;
    `);
    
    console.log('\n--- All Tables in Bear Database ---');
    tables.forEach(table => console.log(table.name));
    
    // Find tables related to tags
    const tagTables = tables.filter(table => 
      table.name.toLowerCase().includes('tag') || 
      table.name.toLowerCase().includes('z_')
    );
    
    console.log('\n--- Potential Tag-Related Tables ---');
    tagTables.forEach(table => console.log(table.name));
    
    // Detect Z_* junction tables which often connect many-to-many relationships
    const junctionTables = tables.filter(table => 
      table.name.startsWith('Z_') && 
      !table.name.includes('FTS')
    );
    
    console.log('\n--- Junction Tables (Z_*) ---');
    junctionTables.forEach(table => console.log(table.name));
    
    // Get schema for each tag-related table
    console.log('\n--- Schema Details for Tag-Related Tables ---');
    for (const table of tagTables) {
      const schema = await db.allAsync(`PRAGMA table_info(${table.name})`);
      console.log(`\nTable: ${table.name}`);
      schema.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
      });
    }
    
    // Check if Z_7TAGS exists and suggest alternatives
    const hasZ7Tags = tables.some(table => table.name === 'Z_7TAGS');
    if (!hasZ7Tags) {
      console.log('\n--- Z_7TAGS Table Not Found ---');
      
      // Look for possible alternative junction tables between notes and tags
      console.log('\nPossible alternatives for note-tag relationships:');
      for (const table of junctionTables) {
        try {
          // Get the first few rows to sample the data
          const sampleData = await db.allAsync(`SELECT * FROM ${table.name} LIMIT 5`);
          if (sampleData && sampleData.length > 0) {
            console.log(`\nTable ${table.name} contents (sample):`);
            console.log(JSON.stringify(sampleData, null, 2));
          }
        } catch (error) {
          console.error(`Error reading from ${table.name}:`, error.message);
        }
      }
      
      // Look specifically at the ZSFNOTETAG table structure and contents
      if (tables.some(table => table.name === 'ZSFNOTETAG')) {
        try {
          console.log('\nExamining ZSFNOTETAG table structure:');
          const noteTagSchema = await db.allAsync(`PRAGMA table_info(ZSFNOTETAG)`);
          noteTagSchema.forEach(col => {
            console.log(`  - ${col.name} (${col.type})`);
          });
          
          // Sample some data from the note tag table
          const noteTagSample = await db.allAsync(`SELECT * FROM ZSFNOTETAG LIMIT 5`);
          console.log('\nZSFNOTETAG sample data:');
          console.log(JSON.stringify(noteTagSample, null, 2));
        } catch (error) {
          console.error('Error examining ZSFNOTETAG:', error.message);
        }
      }
      
      // Look for ZSFNOTE structure to understand how notes are stored
      if (tables.some(table => table.name === 'ZSFNOTE')) {
        try {
          console.log('\nExamining ZSFNOTE table structure:');
          const noteSchema = await db.allAsync(`PRAGMA table_info(ZSFNOTE)`);
          noteSchema.forEach(col => {
            console.log(`  - ${col.name} (${col.type})`);
          });
        } catch (error) {
          console.error('Error examining ZSFNOTE:', error.message);
        }
      }
    }
    
    // Try actual query used in the code to see what error it produces
    try {
      console.log('\n--- Testing the Problematic Query ---');
      // Get a sample note ID first
      const sampleNote = await db.getAsync(`
        SELECT ZUNIQUEIDENTIFIER as id FROM ZSFNOTE LIMIT 1
      `);
      
      if (sampleNote) {
        try {
          const tags = await db.allAsync(`
            SELECT ZT.ZTITLE as tag_name
            FROM Z_5TAGS ZNT
            JOIN ZSFNOTETAG ZT ON ZT.Z_PK = ZNT.Z_13TAGS
            JOIN ZSFNOTE ZN ON ZN.Z_PK = ZNT.Z_5NOTES
            WHERE ZN.ZUNIQUEIDENTIFIER = ?
          `, [sampleNote.id]);
          
          console.log('Query succeeded with results:', tags);
        } catch (error) {
          console.error('The problematic query failed with error:', error.message);
          
          // Try to identify the correct join pattern
          console.log('\nAttempting to find the correct table relationship...');
          
          for (const jTable of junctionTables) {
            // Skip large tables for performance reasons
            const count = await db.getAsync(`SELECT COUNT(*) as count FROM ${jTable.name}`);
            if (count.count > 1000) {
              console.log(`Skipping large table ${jTable.name} with ${count.count} rows`);
              continue;
            }
            
            const schema = await db.allAsync(`PRAGMA table_info(${jTable.name})`);
            const columns = schema.map(col => col.name);
            
            // Look for columns that might connect to notes and tags
            const noteCols = columns.filter(col => col.includes('NOTE') || col.includes('NOTES'));
            const tagCols = columns.filter(col => col.includes('TAG') || col.includes('TAGS'));
            
            if (noteCols.length > 0 && tagCols.length > 0) {
              console.log(`\nPotential junction table: ${jTable.name}`);
              console.log(`  Note columns: ${noteCols.join(', ')}`);
              console.log(`  Tag columns: ${tagCols.join(', ')}`);
              
              // Try a sample query with this table
              try {
                const noteCol = noteCols[0];
                const tagCol = tagCols[0];
                
                const testQuery = `
                  SELECT ZT.ZTITLE as tag_name
                  FROM ${jTable.name} J
                  JOIN ZSFNOTETAG ZT ON ZT.Z_PK = J.${tagCol}
                  JOIN ZSFNOTE ZN ON ZN.Z_PK = J.${noteCol}
                  WHERE ZN.ZUNIQUEIDENTIFIER = ?
                  LIMIT 5
                `;
                
                console.log(`Trying query: ${testQuery}`);
                const testResult = await db.allAsync(testQuery, [sampleNote.id]);
                
                console.log(`Test query succeeded! Found ${testResult.length} tags:`, testResult);
                
                // Print the full working query for implementation
                console.log('\nWORKING QUERY:');
                console.log(`
SELECT ZT.ZTITLE as tag_name
FROM ${jTable.name} J
JOIN ZSFNOTETAG ZT ON ZT.Z_PK = J.${tagCol}
JOIN ZSFNOTE ZN ON ZN.Z_PK = J.${noteCol}
WHERE ZN.ZUNIQUEIDENTIFIER = ?
                `);
              } catch (testError) {
                console.log(`Test query failed: ${testError.message}`);
              }
            }
          }
        }
      } else {
        console.log('No notes found in the database');
      }
    } catch (queryError) {
      console.error('Error running test query:', queryError.message);
    }
    
  } catch (error) {
    console.error('Error examining database:', error.message);
  } finally {
    db.close(() => {
      console.log('\nDatabase connection closed.');
    });
  }
}

examineDatabase();
