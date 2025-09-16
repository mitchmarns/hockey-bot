# cogs/config.py
import discord, json
from typing import Optional, Literal
from discord.ext import commands
from discord import app_commands
from utils.db import DB

def need_manage_guild(inter: discord.Interaction) -> bool:
    m = inter.user
    return isinstance(m, discord.Member) and m.guild_permissions.manage_guild

DEFAULT_FORM = [
    {"key": "name",        "label": "Name",        "style": "short",     "required": True,  "max_length": 80},
    {"key": "age",         "label": "Age",         "style": "short",     "required": True,  "max_length": 10},
    {"key": "face_claim",  "label": "Face Claim",  "style": "short",     "required": True,  "max_length": 100},
    {"key": "occupation",  "label": "Occupation",  "style": "short",     "required": True,  "max_length": 100},
]

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

    # cogs/config.py
import discord, json
from typing import Optional, Literal
from discord.ext import commands
from discord import app_commands
from utils.db import DB

def need_manage_guild(inter: discord.Interaction) -> bool:
    m = inter.user
    return isinstance(m, discord.Member) and m.guild_permissions.manage_guild

DEFAULT_FORM = [
    {"key": "name",        "label": "Name",        "style": "short",     "required": True,  "max_length": 80},
    {"key": "age",         "label": "Age",         "style": "short",     "required": True,  "max_length": 10},
    {"key": "face_claim",  "label": "Face Claim",  "style": "short",     "required": True,  "max_length": 100},
    {"key": "occupation",  "label": "Occupation",  "style": "short",     "required": True,  "max_length": 100},
]

class Config(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # --- Review settings ---
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

    # Form management
    @app_commands.command(name="config_form_list", description="Admin: show the current application questions for this server.")
    async def config_form_list(self, inter: discord.Interaction):
        if not need_manage_guild(inter):
            return await inter.response.send_message("You need **Manage Server** to do this.", ephemeral=True)

        form = await DB.get_form(inter.guild_id)  # type: ignore
        if not form:
            form = DEFAULT_FORM

        lines = []
        for i, f in enumerate(form, start=1):
            lines.append(
                f"**{i}.** key: `{f['key']}` — label: *{f.get('label','') or f['key']}* — "
                f"style: `{f.get('style','short')}` — required: `{bool(f.get('required', False))}` — "
                f"max_length: `{int(f.get('max_length', 100))}`"
            )
        note = "\n(Only the first **5** fields are used in the modal.)"
        await inter.response.send_message("\n".join(lines) + note, ephemeral=True)

    @app_commands.command(name="config_form_add", description="Admin: add a question to the application.")
    @app_commands.describe(
        key="Unique machine key, e.g. face_claim",
        label="Shown to users",
        style="Input style",
        required="Whether user must fill it",
        max_length="Max characters allowed (20-2000)",
        default="Optional default value"
    )
    async def config_form_add(
        self,
        inter: discord.Interaction,
        key: str,
        label: str,
        style: Literal["short", "paragraph"] = "short",
        required: Optional[bool] = True,
        max_length: Optional[int] = None,
        default: Optional[str] = None,
    ):
        if not need_manage_guild(inter):
            return await inter.response.send_message("You need **Manage Server** to do this.", ephemeral=True)

        key = key.strip().lower()
        if not key or not key.replace("_", "").isalnum():
            return await inter.response.send_message("Key must be alphanumeric/underscores.", ephemeral=True)

        form = await DB.get_form(inter.guild_id)  # type: ignore
        form = [dict(f) for f in form] if form else []
        if any(f["key"] == key for f in form):
            return await inter.response.send_message(f"Field with key `{key}` already exists.", ephemeral=True)
        if len(form) >= 5:
            return await inter.response.send_message("You already have 5 fields. Remove one first.", ephemeral=True)

        ml = 2000 if style == "paragraph" else 100
        if max_length is not None:
            ml = max(20, min(int(max_length), 2000))

        form.append({
            "key": key,
            "label": label.strip() or key.title(),
            "style": style,
            "required": bool(required),
            "max_length": int(ml),
            **({"default": str(default)} if default else {}),
        })

        await DB.set_form(inter.guild_id, form)  # type: ignore
        await inter.response.send_message(f"✅ Added field `{key}`.", ephemeral=True)

    @app_commands.command(name="config_form_remove", description="Admin: remove a question by key.")
    @app_commands.describe(key="The field key to remove")
    async def config_form_remove(self, inter: discord.Interaction, key: str):
        if not need_manage_guild(inter):
            return await inter.response.send_message("You need **Manage Server** to do this.", ephemeral=True)

        key = key.strip().lower()
        form = await DB.get_form(inter.guild_id)  # type: ignore
        form = [dict(f) for f in form] if form else []
        new_form = [f for f in form if f["key"] != key]
        if len(new_form) == len(form):
            return await inter.response.send_message(f"No field found with key `{key}`.", ephemeral=True)

        await DB.set_form(inter.guild_id, new_form)  # type: ignore
        await inter.response.send_message(f"✅ Removed field `{key}`.", ephemeral=True)

    @app_commands.command(name="config_form_reset", description="Admin: reset application to default 4 fields.")
    async def config_form_reset(self, inter: discord.Interaction):
        if not need_manage_guild(inter):
            return await inter.response.send_message("You need **Manage Server** to do this.", ephemeral=True)

        await DB.set_form(inter.guild_id, DEFAULT_FORM)  # type: ignore
        await inter.response.send_message("🔄 Reset form to defaults (Name, Age, Face Claim, Occupation).", ephemeral=True)

async def setup(bot: commands.Bot):
    await bot.add_cog(Config(bot))
