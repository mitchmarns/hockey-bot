# utils/db.py
import json
import aiosqlite
import asyncio
from typing import Optional

DB_PATH = "bot.db"

INIT_SQL = """

DEFAULT_FORM = [
    {"key": "name", "label": "Name", "style": "short", "required": True, "max_length": 80},
    {"key": "age", "label": "Age", "style": "short", "required": True, "max_length": 10},
    {"key": "face_claim", "label": "Face Claim", "style": "short", "required": True, "max_length": 100},
    {"key": "occupation", "label": "Occupation", "style": "short", "required": True, "max_length": 100},
]

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

CREATE TABLE IF NOT EXISTS guild_forms (
  guild_id INTEGER PRIMARY KEY,
  form_json TEXT NOT NULL  -- JSON array of field descriptors
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

            db.row_factory = aiosqlite.Row
            cur = await db.execute("PRAGMA table_info(characters)")
            cols = {row["name"] for row in await cur.fetchall()}
            if "extra_json" not in cols:
                await db.execute("ALTER TABLE characters ADD COLUMN extra_json TEXT")
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

    # -------- guild forms --------
    @staticmethod
    async def get_form(guild_id: int):
      async with DB.connect() as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT form_json FROM guild_forms WHERE guild_id=?", (guild_id,))
        row = await cur.fetchone()
        return json.loads(row["form_json"]) if row else DEFAULT_FORM

    @staticmethod
    async def set_form(guild_id: int, form: list[dict]):
        async with DB.connect() as db:
            data = json.dumps(form, ensure_ascii=False)
            await db.execute("""
                INSERT INTO guild_forms(guild_id, form_json)
                VALUES (?, ?)
                ON CONFLICT(guild_id) DO UPDATE SET form_json=excluded.form_json
            """, (guild_id, data))
            await db.commit()

    # -------- characters --------
    @staticmethod
    async def create_character(guild_id: int, owner_id: int, name: str, age: str,
                               face_claim: str, occupation: str, extra_json: Optional[str],) -> int:
        async with DB.connect() as db:
            await db.execute("INSERT OR IGNORE INTO users(user_id) VALUES (?);", (owner_id,))
            cur = await db.execute("""
                INSERT INTO characters(guild_id, owner_id, name, age, face_claim, occupation, extra_json)
                VALUES (?,?,?,?,?,?,?)
            """, (guild_id, owner_id, name, age, face_claim, occupation, extra_json))
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
