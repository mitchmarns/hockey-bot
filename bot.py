import os
import importlib
import pkgutil
import discord
from discord.ext import commands

TOKEN = os.getenv("DISCORD_TOKEN")
CLIENT_ID = os.getenv("CLIENT_ID")

intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    await bot.tree.sync()
    print(f"✅ Logged in as {bot.user} (ID: {bot.user.id}) — cogs loaded.")

# Auto-load every module in cogs/
def load_all_cogs():
    import cogs
    for _, name, _ in pkgutil.iter_modules(cogs.__path__):
        importlib.import_module(f"cogs.{name}")

load_all_cogs()

if not TOKEN:
    raise RuntimeError("DISCORD_TOKEN is not set in Variables tab.")
bot.run(TOKEN)
