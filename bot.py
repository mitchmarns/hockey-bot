import os
import discord
from discord.ext import commands
from discord import app_commands
from dotenv import load_dotenv

# Load .env values
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
CLIENT_ID = os.getenv("CLIENT_ID")

intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    try:
        await bot.tree.sync()
        print(f"✅ Logged in as {bot.user} (ID: {bot.user.id})")
        print("✅ Slash commands synced.")
    except Exception as e:
        print("❌ Error syncing commands:", e)

# Example command: /ping
@bot.tree.command(description="Check if the bot is alive")
async def ping(interaction: discord.Interaction):
    await interaction.response.send_message("Pong! 🏓")

bot.run(TOKEN)
