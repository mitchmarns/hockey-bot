# cogs/characters.py
from typing import Optional
import discord
from discord.ext import commands
from discord import app_commands, ui
from utils.db import DB

def is_reviewer(member: discord.Member, settings_row) -> bool:
    if member.guild_permissions.manage_guild:
        return True
    if settings_row and settings_row.get("reviewer_role_id"):
        rid = int(settings_row["reviewer_role_id"])
        return any(r.id == rid for r in member.roles)
    return False

def char_embed(row: dict) -> discord.Embed:
    e = discord.Embed(title=f"Character #{row['id']}: {row['name']}", color=0x5B6770)
    e.add_field(name="Owner", value=f"<@{row['owner_id']}>", inline=True)
    e.add_field(name="Status", value=row["status"], inline=True)
    if row.get("bio"): e.add_field(name="Bio", value=row["bio"][:1024], inline=False)
    if row.get("tupper_name"):
        e.add_field(name="Tupper", value=f"{row['tupper_name']} ({row['tupper_id'] or 'no id'})", inline=True)
    if row.get("decision_reason"):
        e.add_field(name="Decision Reason", value=row["decision_reason"][:1024], inline=False)
    if row.get("avatar_url"): e.set_thumbnail(url=row["avatar_url"])
    return e

class ApplyModal(ui.Modal, title="Character Application"):
    name = ui.TextInput(label="Character name", max_length=80, required=True)
    bio = ui.TextInput(label="Short bio (1–3 sentences)", style=discord.TextStyle.paragraph, max_length=500, required=True)
    avatar_url = ui.TextInput(label="Avatar URL (optional)", required=False)
    tupper_name = ui.TextInput(label="Tupperbox name (optional)", required=False)
    tupper_id = ui.TextInput(label="Tupperbox ID (optional)", required=False)

    def __init__(self, bot: commands.Bot):
        super().__init__(timeout=300)
        self.bot = bot

    async def on_submit(self, interaction: discord.Interaction):
        if not interaction.guild:
            return await interaction.response.send_message("Use this in a server.", ephemeral=True)
        guild_id = interaction.guild_id  # type: ignore
        owner_id = interaction.user.id

        char_id = await DB.create_character(
            guild_id=guild_id,
            owner_id=owner_id,
            name=str(self.name),
            bio=str(self.bio),
            avatar_url=str(self.avatar_url) or None,
            tupper_name=str(self.tupper_name) or None,
            tupper_id=str(self.tupper_id) or None
        )

        row = await DB.get_character(guild_id, char_id)
        e = char_embed(row)

        settings = await DB.get_settings(guild_id)
        review_channel = interaction.guild.get_channel(settings["review_channel_id"]) if (settings and settings["review_channel_id"]) else None  # type: ignore

        view = ReviewButtons(guild_id, char_id)
        if review_channel:
            await review_channel.send(embed=e, view=view)
            await interaction.response.send_message(f"✅ Application submitted! Your ID is **{char_id}**. Mods will review it soon.", ephemeral=True)
        else:
            await interaction.response.send_message(content="(No review channel set with /config_reviewchannel — showing preview here.)", embed=e, view=view, ephemeral=True)

class ReviewButtons(ui.View):
    def __init__(self, guild_id: int, char_id: int):
        super().__init__(timeout=None)
        self.guild_id = guild_id
        self.char_id = char_id

    @ui.button(label="Approve", style=discord.ButtonStyle.success)
    async def approve(self, interaction: discord.Interaction, button: ui.Button):
        if not interaction.guild: return await interaction.response.send_message("Use this in a server.", ephemeral=True)
        settings = await DB.get_settings(interaction.guild_id)  # type: ignore
        if not isinstance(interaction.user, discord.Member) or not is_reviewer(interaction.user, settings):
            return await interaction.response.send_message("You can’t approve this.", ephemeral=True)

        await DB.set_status(self.guild_id, self.char_id, "approved", interaction.user.id, None)
        row = await DB.get_character(self.guild_id, self.char_id)
        await interaction.response.edit_message(embed=char_embed(row), view=None)
        try:
            await interaction.followup.send(f"✅ Approved character **#{self.char_id}**.", ephemeral=True)
            owner = interaction.guild.get_member(row["owner_id"])
            if owner: await owner.send(f"Your character **{row['name']}** (ID {self.char_id}) was approved!")
        except Exception:
            pass

    @ui.button(label="Reject", style=discord.ButtonStyle.danger)
    async def reject(self, interaction: discord.Interaction, button: ui.Button):
        if not interaction.guild: return await interaction.response.send_message("Use this in a server.", ephemeral=True)
        settings = await DB.get_settings(interaction.guild_id)  # type: ignore
        if not isinstance(interaction.user, discord.Member) or not is_reviewer(interaction.user, settings):
            return await interaction.response.send_message("You can’t reject this.", ephemeral=True)
        await interaction.response.send_modal(RejectModal(self.guild_id, self.char_id))

class RejectModal(ui.Modal, title="Reject Character"):
    reason = ui.TextInput(label="Reason (optional)", style=discord.TextStyle.paragraph, required=False)
    def __init__(self, guild_id: int, char_id: int):
        super().__init__(timeout=300)
        self.guild_id = guild_id
        self.char_id = char_id

    async def on_submit(self, interaction: discord.Interaction):
        if not interaction.guild: return await interaction.response.send_message("Use this in a server.", ephemeral=True)
        settings = await DB.get_settings(interaction.guild_id)  # type: ignore
        if not isinstance(interaction.user, discord.Member) or not is_reviewer(interaction.user, settings):
            return await interaction.response.send_message("You can’t reject this.", ephemeral=True)

        await DB.set_status(self.guild_id, self.char_id, "rejected", interaction.user.id, str(self.reason) or None)
        row = await DB.get_character(self.guild_id, self.char_id)
        await interaction.response.edit_message(embed=char_embed(row), view=None)
        try:
            owner = interaction.guild.get_member(row["owner_id"])
            if owner: await owner.send(f"Your character **{row['name']}** (ID {self.char_id}) was rejected.\nReason: {row['decision_reason'] or '—'}")
        except Exception:
            pass

class Characters(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="apply", description="Apply for a character (admin review required).")
    async def apply(self, interaction: discord.Interaction):
        if not interaction.guild:
            return await interaction.response.send_message("Use this in a server.", ephemeral=True)
        await interaction.response.send_modal(ApplyModal(self.bot))

    @app_commands.command(name="characters", description="List your characters or view one.")
    @app_commands.describe(id="Character ID (optional). If omitted, lists your characters in this server.")
    async def characters(self, interaction: discord.Interaction, id: Optional[int] = None):
        if not interaction.guild:
            return await interaction.response.send_message("Use this in a server.", ephemeral=True)
        gid = interaction.guild_id  # type: ignore
        if id:
            row = await DB.get_character(gid, id)
            if not row:
                return await interaction.response.send_message("Character not found (in this server).", ephemeral=True)
            if row["owner_id"] != interaction.user.id and not interaction.user.guild_permissions.manage_guild:
                return await interaction.response.send_message("You don’t have access to that character.", ephemeral=True)
            return await interaction.response.send_message(embed=char_embed(row), ephemeral=True)
        else:
            rows = await DB.list_my_characters(gid, interaction.user.id)
            if not rows:
                return await interaction.response.send_message("You have no characters in this server. Try **/apply**.", ephemeral=True)
            lines = [f"**#{r['id']}** — {r['name']} — *{r['status']}*" for r in rows[:5]]
            more = f"\n…and {len(rows)-5} more." if len(rows) > 5 else ""
            await interaction.response.send_message("\n".join(lines) + more, ephemeral=True)

    @app_commands.command(name="unlink", description="Remove one of your characters (only if you own it).")
    @app_commands.describe(id="Character ID to remove (from this server)")
    async def unlink(self, interaction: discord.Interaction, id: int):
        if not interaction.guild:
            return await interaction.response.send_message("Use this in a server.", ephemeral=True)
        ok = await DB.unlink(interaction.guild_id, interaction.user.id, id)  # type: ignore
        if ok:
            await interaction.response.send_message(f"Removed character **#{id}**.", ephemeral=True)
        else:
            await interaction.response.send_message("Couldn’t remove (wrong ID or not your character in this server).", ephemeral=True)

    @app_commands.command(name="apps", description="Admin: view pending applications in this server.")
    @app_commands.describe(limit="Max rows (default 20)")
    async def apps(self, interaction: discord.Interaction, limit: Optional[int] = 20):
        if not interaction.guild:
            return await interaction.response.send_message("Use this in a server.", ephemeral=True)
        settings = await DB.get_settings(interaction.guild_id)  # type: ignore
        if not isinstance(interaction.user, discord.Member) or not is_reviewer(interaction.user, settings):
            return await interaction.response.send_message("You can’t use this.", ephemeral=True)
        rows = await DB.list_pending(interaction.guild_id, limit or 20)  # type: ignore
        if not rows:
            return await interaction.response.send_message("No pending applications.", ephemeral=True)
        lines = [f"**#{r['id']}** — {r['name']} — <@{r['owner_id']}>" for r in rows]
        await interaction.response.send_message("\n".join(lines), ephemeral=True)

    @app_commands.command(name="approve", description="Admin: approve an application by ID (this server).")
    async def approve(self, interaction: discord.Interaction, id: int):
        if not interaction.guild:
            return await interaction.response.send_message("Use this in a server.", ephemeral=True)
        settings = await DB.get_settings(interaction.guild_id)  # type: ignore
        if not isinstance(interaction.user, discord.Member) or not is_reviewer(interaction.user, settings):
            return await interaction.response.send_message("You can’t use this.", ephemeral=True)
        row = await DB.get_character(interaction.guild_id, id)  # type: ignore
        if not row:
            return await interaction.response.send_message("Not found in this server.", ephemeral=True)
        await DB.set_status(interaction.guild_id, id, "approved", interaction.user.id, None)  # type: ignore
        await interaction.response.send_message(f"✅ Approved **#{id}** ({row['name']}).", ephemeral=True)

    @app_commands.command(name="reject", description="Admin: reject an application by ID (this server).")
    @app_commands.describe(reason="Optional reason")
    async def reject(self, interaction: discord.Interaction, id: int, reason: Optional[str] = None):
        if not interaction.guild:
            return await interaction.response.send_message("Use this in a server.", ephemeral=True)
        settings = await DB.get_settings(interaction.guild_id)  # type: ignore
        if not isinstance(interaction.user, discord.Member) or not is_reviewer(interaction.user, settings):
            return await interaction.response.send_message("You can’t use this.", ephemeral=True)
        row = await DB.get_character(interaction.guild_id, id)  # type: ignore
        if not row:
            return await interaction.response.send_message("Not found in this server.", ephemeral=True)
        await DB.set_status(interaction.guild_id, id, "rejected", interaction.user.id, reason)  # type: ignore
        await interaction.response.send_message(f"❌ Rejected **#{id}** ({row['name']}).", ephemeral=True)

async def setup(bot: commands.Bot):
    await bot.add_cog(Characters(bot))
