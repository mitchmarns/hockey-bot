import discord, aiohttp
from discord.ext import commands
from discord import app_commands
from utils.storage import JsonStore

STORE = JsonStore("webhooks.json")

def _can_set(inter: discord.Interaction):
    p = inter.channel.permissions_for(inter.user)  # type: ignore
    return p.manage_webhooks or p.manage_channels or p.administrator

class Webhooks(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="setwebhook", description="Connect this channel to a Discord webhook URL (mods/admins).")
    @app_commands.describe(url="Webhook URL from Channel → Integrations → Webhooks")
    async def setwebhook(self, inter: discord.Interaction, url: str):
        if not _can_set(inter):
            return await inter.response.send_message(
                "You need **Manage Webhooks** or **Manage Channels**.", ephemeral=True
            )
        if not url.startswith("https://discord.com/api/webhooks/"):
            return await inter.response.send_message("That doesn't look like a Discord webhook URL.", ephemeral=True)
        STORE.set(str(inter.channel_id), url)
        await inter.response.send_message("✅ Webhook saved for this channel.", ephemeral=True)

    @app_commands.command(name="testwebhook", description="Send a quick test through the saved webhook.")
    async def testwebhook(self, inter: discord.Interaction):
        url = STORE.get(str(inter.channel_id))
        if not url:
            return await inter.response.send_message("No webhook set. Run **/setwebhook** first.", ephemeral=True)
        await inter.response.defer(ephemeral=True)
        try:
            async with aiohttp.ClientSession() as s:
                wh = discord.Webhook.from_url(url, session=s)
                await wh.send("Webhook is working ✅", allowed_mentions=discord.AllowedMentions.none())
            await inter.followup.send("✅ Sent.", ephemeral=True)
        except Exception as e:
            await inter.followup.send(f"❌ Failed: {e}", ephemeral=True)

async def setup(bot: commands.Bot):
    await bot.add_cog(Webhooks(bot))
