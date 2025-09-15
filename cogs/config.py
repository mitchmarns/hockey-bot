# cogs/config.py
import discord
from discord.ext import commands
from discord import app_commands
from utils.db import DB

def need_manage_guild(inter: discord.Interaction) -> bool:
    m = inter.user
    return isinstance(m, discord.Member) and m.guild_permissions.manage_guild

class Config(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="config_reviewchannel", description="Set the review channel for this server.")
    @app_commands.describe(channel="Channel where applications will be posted for review")
    async def config_reviewchannel(self, inter: discord.Interaction, channel: discord.abc.GuildChannel):
        if not need_manage_guild(inter):
            return await inter.response.send_message("You need **Manage Server** to do this.", ephemeral=True)
        await DB.set_review_channel(inter.guild_id, channel.id)  # type: ignore
        await inter.response.send_message(f"✅ Review channel set to {channel.mention}.", ephemeral=True)

    @app_commands.command(name="config_reviewerrole", description="Set the reviewer role for this server (optional).")
    @app_commands.describe(role="Role allowed to approve/reject (admins always can). Use None to clear.")
    async def config_reviewerrole(self, inter: discord.Interaction, role: discord.Role | None = None):
        if not need_manage_guild(inter):
            return await inter.response.send_message("You need **Manage Server** to do this.", ephemeral=True)
        rid = role.id if role else None
        await DB.set_reviewer_role(inter.guild_id, rid)  # type: ignore
        if role:
            await inter.response.send_message(f"✅ Reviewer role set to {role.mention}.", ephemeral=True)
        else:
            await inter.response.send_message("✅ Reviewer role cleared (admins only).", ephemeral=True)

    @app_commands.command(name="config_show", description="Show current config for this server.")
    async def config_show(self, inter: discord.Interaction):
        row = await DB.get_settings(inter.guild_id)  # type: ignore
        if not row:
            return await inter.response.send_message("No settings yet. Set a review channel with **/config_reviewchannel**.", ephemeral=True)
        channel = inter.guild.get_channel(row["review_channel_id"]) if row["review_channel_id"] else None  # type: ignore
        role = inter.guild.get_role(row["reviewer_role_id"]) if row["reviewer_role_id"] else None  # type: ignore
        lines = [
            f"**Review channel:** {channel.mention if channel else '—'}",
            f"**Reviewer role:** {role.mention if role else 'Admins only'}",
        ]
        await inter.response.send_message("\n".join(lines), ephemeral=True)

async def setup(bot: commands.Bot):
    await bot.add_cog(Config(bot))
