// database/db.js - Updated version
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { getDbPath } = require('../config/config');

// Store database connections by guild ID
const connections = {};
// Extend connection TTL to effectively keep connections open permanently
const connectionTTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const connTimers = {};

// Create a promise-based version of getDb to handle initialization
async function getDbAsync(guildId) {
  if (!guildId) {
    throw new Error('Guild ID is required to get database connection');
  }
  
  // Automatically initialize if connection doesn't exist
  if (!connections[guildId]) {
    console.log(`Database not initialized for guild ${guildId}. Auto-initializing...`);
    try {
      await initDatabase(guildId);
      console.log(`Successfully auto-initialized database for guild ${guildId}`);
    } catch (error) {
      console.error(`Error auto-initializing database for guild ${guildId}:`, error);
      throw new Error(`Failed to auto-initialize database: ${error.message}`);
    }
  }
  
  // Reset timer when DB is accessed
  if (connTimers[guildId]) {
    clearTimeout(connTimers[guildId]);
  }
  
  // Set new timeout with extended TTL
  connTimers[guildId] = setTimeout(() => {
    console.log(`Closing inactive DB connection for guild ${guildId}`);
    connections[guildId].close().catch(err => 
      console.error(`Error closing DB connection for guild ${guildId}:`, err)
    );
    delete connections[guildId];
    delete connTimers[guildId];
  }, connectionTTL);
  
  return connections[guildId];
}

// Initialize the database for a specific guild
async function initDatabase(guildId) {
  if (!guildId) {
    throw new Error('Guild ID is required to initialize database');
  }
  
  const dbPath = getDbPath(guildId);
  
  // Open the database
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  console.log(`Connected to SQLite database for guild ${guildId}`);
  
  // Store the connection BEFORE migrations
  connections[guildId] = db;
  
  // Create tables if they don't exist
  // [rest of table creation code remains the same]
  
  // Run database migrations
  try {
    await migrateDatabase(guildId);
    console.log(`Database migrations completed for guild ${guildId}`);
  } catch (error) {
    console.error(`Error during database migration for guild ${guildId}:`, error);
    // Continue anyway, so the bot can still function with base tables
  }
  
  return db;
}

// Legacy synchronous getDb function - now automatically handles initialization errors
function getDb(guildId) {
  if (!guildId) {
    throw new Error('Guild ID is required to get database connection');
  }
  
  // For backward compatibility - if the connection exists, return it immediately
  if (connections[guildId]) {
    // Reset the timer as usual
    if (connTimers[guildId]) {
      clearTimeout(connTimers[guildId]);
    }
    
    connTimers[guildId] = setTimeout(() => {
      console.log(`Closing inactive DB connection for guild ${guildId}`);
      connections[guildId].close().catch(err => 
        console.error(`Error closing DB connection for guild ${guildId}:`, err)
      );
      delete connections[guildId];
      delete connTimers[guildId];
    }, connectionTTL);
    
    return connections[guildId];
  }
  
  // If connection does not exist, throw a more informative error
  console.error(`Database not initialized for guild ${guildId}. Attempting auto-initialization...`);
  
  // Start async initialization but can't wait for it here
  initDatabase(guildId)
    .then(() => console.log(`Background initialization completed for guild ${guildId}`))
    .catch(err => console.error(`Background initialization failed for guild ${guildId}:`, err));
  
  // Return a dummy database object with methods that will retry when initialization completes
  return createRetryingDbProxy(guildId);
}

// Create a proxy object that will retry operations once the real DB is available
function createRetryingDbProxy(guildId) {
  const dbMethods = ['all', 'get', 'run', 'exec'];
  const proxy = {};
  
  for (const method of dbMethods) {
    proxy[method] = async (...args) => {
      // Wait a bit for initialization to complete
      for (let i = 0; i < 10; i++) {
        if (connections[guildId]) {
          return connections[guildId][method](...args);
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
      }
      throw new Error(`Database connection for guild ${guildId} is still initializing. Please try again.`);
    };
  }
  
  return proxy;
}

// Database migration system - unchanged
async function migrateDatabase(guildId) {
  // [Your existing migration code remains unchanged]
}

module.exports = {
  initDatabase,
  getDb,
  getDbAsync,
  migrateDatabase
};