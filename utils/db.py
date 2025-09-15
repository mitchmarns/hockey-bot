# bot.py
import os, pkgutil, discord
from discord.ext import commands
from utils.db import DB   # <-- add this import

TOKEN = os.getenv("DISCORD_TOKEN")

class MyBot(commands.Bot):
    async def setup_hook(self):
        # Init DB first
        await DB.init()

        # Load every cog in cogs/
        import cogs
        for _, name, _ in pkgutil.iter_modules(cogs.__path__):
            await self.load_extension(f"cogs.{name}")

        # Sync slash commands
        await self.tree.sync()
        print("✅ Slash commands synced.")

intents = discord.Intents.default()
bot = MyBot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    print(f"✅ Logged in as {bot.user} (ID: {bot.user.id})")

@bot.tree.command(description="Check if the bot is alive")
async def ping(interaction: discord.Interaction):
    await interaction.response.send_message("Pong! 🏓")

if not TOKEN:
    raise RuntimeError("DISCORD_TOKEN not set")
bot.run(TOKEN)
