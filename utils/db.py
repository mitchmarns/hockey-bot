# utils/db.py
import aiosqlite
import asyncio
from typing import Optional

DB_PATH = "bot.db"

INIT_SQL = """
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id INTEGER PRIMARY KEY,
  review_channel_id INTEGER,
  reviewer_role_id INTEGER
);

CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id INTEGER NOT NULL,
  owner_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  tupper_name TEXT,
  tupper_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  submitted_at TEXT DEFAULT (datetime('now')),
  reviewed_by INTEGER,
  decision_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_characters_guild_status ON characters(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_characters_owner ON characters(owner_id);
"""

# guards so init runs exactly once even if called multiple times
_init_lock = asyncio.Lock()
_initialized = False

class DB:
    @staticmethod
    def connect():
        return aiosqlite.connect(DB_PATH)

    @staticmethod
    async def init():
        global _initialized
        if _initialized:
            return
        async with _init_lock:
            if _initialized:
                return
            async with DB.connect() as db:
                await db.executescript(INIT_SQL)
                await db.commit()
            _initialized = True

    # -------- guild settings --------
    @staticmethod
    async def get_settings(guild_id: int):
        async with DB.connect() as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute("SELECT * FROM guild_settings WHERE guild_id=?", (guild_id,))
            return await cur.fetchone()

    @staticmethod
    async def set_review_channel(guild_id: int, channel_id: Optional[int]):
        async with DB.connect() as db:
            await db.execute("""
                INSERT INTO guild_settings(guild_id, review_channel_id)
                VALUES (?, ?)
                ON CONFLICT(guild_id) DO UPDATE SET review_channel_id=excluded.review_channel_id
            """, (guild_id, channel_id))
            await db.commit()

    @staticmethod
    async def set_reviewer_role(guild_id: int, role_id: Optional[int]):
        async with DB.connect() as db:
            await db.execute("""
                INSERT INTO guild_settings(guild_id, reviewer_role_id)
                VALUES (?, ?)
                ON CONFLICT(guild_id) DO UPDATE SET reviewer_role_id=excluded.reviewer_role_id
            """, (guild_id, role_id))
            await db.commit()

    # -------- characters --------
    @staticmethod
    async def create_character(guild_id: int, owner_id: int, name: str, bio: str,
                               avatar_url: Optional[str], tupper_name: Optional[str], tupper_id: Optional[str]) -> int:
        async with DB.connect() as db:
            await db.execute("INSERT OR IGNORE INTO users(user_id) VALUES (?);", (owner_id,))
            cur = await db.execute("""
                INSERT INTO characters(guild_id, owner_id, name, bio, avatar_url, tupper_name, tupper_id)
                VALUES (?,?,?,?,?,?,?)
            """, (guild_id, owner_id, name, bio, avatar_url, tupper_name, tupper_id))
            await db.commit()
            return cur.lastrowid

    @staticmethod
    async def get_character(guild_id: int, char_id: int):
        async with DB.connect() as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute("SELECT * FROM characters WHERE id=? AND guild_id=?", (char_id, guild_id))
            return await cur.fetchone()

    @staticmethod
    async def list_my_characters(guild_id: int, owner_id: int, only_status: Optional[str] = None):
        async with DB.connect() as db:
            db.row_factory = aiosqlite.Row
            if only_status:
                cur = await db.execute("""
                    SELECT * FROM characters
                    WHERE guild_id=? AND owner_id=? AND status=?
                    ORDER BY id DESC
                """, (guild_id, owner_id, only_status))
            else:
                cur = await db.execute("""
                    SELECT * FROM characters
                    WHERE guild_id=? AND owner_id=?
                    ORDER BY id DESC
                """, (guild_id, owner_id))
            return await cur.fetchall()

    @staticmethod
    async def list_pending(guild_id: int, limit: int = 20):
        async with DB.connect() as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute("""
                SELECT * FROM characters
                WHERE guild_id=? AND status='pending'
                ORDER BY submitted_at ASC
                LIMIT ?
            """, (guild_id, limit))
            return await cur.fetchall()

    @staticmethod
    async def set_status(guild_id: int, char_id: int, status: str, reviewer_id: int, reason: Optional[str]):
        async with DB.connect() as db:
            await db.execute("""
                UPDATE characters
                SET status=?, reviewed_by=?, decision_reason=?
                WHERE id=? AND guild_id=?
            """, (status, reviewer_id, reason, char_id, guild_id))
            await db.commit()

    @staticmethod
    async def unlink(guild_id: int, owner_id: int, char_id: int) -> bool:
        async with DB.connect() as db:
            cur = await db.execute("""
                DELETE FROM characters
                WHERE id=? AND guild_id=? AND owner_id=?
            """, (char_id, guild_id, owner_id))
            await db.commit()
            return cur.rowcount > 0
