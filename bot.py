import os
import pkgutil
import discord
from discord.ext import commands

TOKEN = os.getenv("DISCORD_TOKEN")
CLIENT_ID = os.getenv("CLIENT_ID")

class MyBot(commands.Bot):
    async def setup_hook(self):
        # Load every module in cogs/ 
        import cogs
        for _, name, _ in pkgutil.iter_modules(cogs.__path__):
            await self.load_extension(f"cogs.{name}")
        # Global sync 
        await self.tree.sync()
        print("✅ Slash commands synced.")

intents = discord.Intents.default()
bot = MyBot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    print(f"✅ Logged in as {bot.user} (ID: {bot.user.id})")

if not TOKEN:
    raise RuntimeError("DISCORD_TOKEN is not set in Variables.")
bot.run(TOKEN)
