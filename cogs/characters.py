# cogs/characters.py
from typing import Optional
from unicodedata import name
import discord
import json, re, traceback
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
    row = dict(row)  # Ensure row is always a dict
    e = discord.Embed(title=f"Character #{row['id']}: {row['name']}", color=0x5B6770)
    e.add_field(name="Owner", value=f"<@{row['owner_id']}>", inline=True)
    e.add_field(name="Status", value=row["status"], inline=True)

    if row.get("bio"):
        e.add_field(name="Bio", value=str(row["bio"])[:1024], inline=False)

    extra_json = row.get("extra_json")
    if extra_json:
        try:
            extra = json.loads(extra_json)
            # Render pretty, but keep it short (Discord limits)
            pretty = []
            for k, v in extra.items():
                if not v:
                    continue
                label = k.replace("_", " ").title()
                pretty.append(f"**{label}**: {v}")
            if pretty:
                e.add_field(name="Extra", value="\n".join(pretty)[:1024], inline=False)
        except Exception:
            pass

    if row.get("decision_reason"):
        e.add_field(name="Decision Reason", value=str(row["decision_reason"])[:1024], inline=False)

    if row.get("avatar_url"):
        e.set_thumbnail(url=row["avatar_url"])

    return e

URL_RE = re.compile(r"^https?://", re.I)

class ApplyModal(ui.Modal):
    def __init__(self, bot: commands.Bot, guild_id: int, form: list[dict]):
        super().__init__(title="Character Application", timeout=300)
        self.bot = bot
        self.guild_id = guild_id
        self.form = form
        self.inputs: dict[str, ui.TextInput] = {}

        # Discord modals allow up to 5 inputs
        for field in form[:5]:
            key = field["key"]
            label = str(field.get("label", key.title()))[:45] or key[:45]
            style = discord.TextStyle.paragraph if field.get("style") == "paragraph" else discord.TextStyle.short
            required = bool(field.get("required", False))
            maxlen = int(field.get("max_length", 2000 if style == discord.TextStyle.paragraph else 100))
            default = str(field.get("default", ""))

            ti = ui.TextInput(label=label, style=style, required=required, max_length=maxlen, default=default)
            self.inputs[key] = ti
            self.add_item(ti)

    async def on_submit(self, interaction: discord.Interaction):
        # Defer first; from now on use interaction.followup.send(...)
        await interaction.response.defer(ephemeral=True, thinking=True)
        try:
            if not interaction.guild:
                await interaction.followup.send("Use this in a server.", ephemeral=True)
                return

            # Collect answers
            answers = {k: (str(inp.value).strip() if inp.value is not None else "")
                       for k, inp in self.inputs.items()}

            # Required: name
            name = answers.pop("name", "") or None
            if not name:
                await interaction.followup.send("Name is required.", ephemeral=True)
                return

            # Everything else goes into extra_json (e.g., Age, Face Claim, Occupation, etc.)
            extra_json = json.dumps({k: v for k, v in answers.items() if v}, ensure_ascii=False) if any(answers.values()) else None

            # Create the character (be tolerant of your DB signature)
            try:
                # Newer DB signature that accepts extra_json as a named arg
                char_id = await DB.create_character(
                    guild_id=interaction.guild_id,       # type: ignore
                    owner_id=interaction.user.id,
                    name=name,
                    extra_json=extra_json,
                )
            except TypeError:
                # Older signature (no extra_json): just store name; extras are ignored
                char_id = await DB.create_character(
                    guild_id=interaction.guild_id,       # type: ignore
                    owner_id=interaction.user.id,
                    name=name,
                )

            # Fetch row + build embed
            row = await DB.get_character(interaction.guild_id, char_id)  # type: ignore
            # aiosqlite.Row -> dict for our embed helper
            row_dict = dict(row) if row is not None else {"id": char_id, "name": name, "owner_id": interaction.user.id, "status": "pending"}
            e = char_embed(row_dict)

            # Where to route the review?
            settings = await DB.get_settings(interaction.guild_id)  # type: ignore
            settings = dict(settings) if settings else {}
            review_channel = None
            rc_id = settings.get("review_channel_id")
            if rc_id:
                review_channel = interaction.guild.get_channel(int(rc_id))

            view = ReviewButtons(interaction.guild_id, char_id)  # type: ignore

            if review_channel:
                # Send to the review channel + save mapping so buttons never expire
                msg = await review_channel.send(embed=e, view=view)
                try:
                    await DB.save_review_message(interaction.guild_id, review_channel.id, msg.id, char_id)  # type: ignore
                except Exception:
                    # If you haven't added save_review_message yet, this will just no-op
                    pass

                await interaction.followup.send(
                    f"✅ Application submitted! Your ID is **{char_id}**. Mods will review it soon.",
                    ephemeral=True
                )
            else:
                # No review channel configured: show preview back to the applicant
                await interaction.followup.send(
                    content="(No review channel set with `/config_reviewchannel` — showing preview here.)",
                    embed=e, view=view, ephemeral=True
                )

        except Exception as err:
            # Log to console and inform the user
            print("[ApplyModalError]", repr(err))
            import traceback; print(traceback.format_exc())
            try:
                await interaction.followup.send(
                    "❌ Something went wrong submitting your application. "
                    "An admin has been notified. Please try again.",
                    ephemeral=True,
                )
            except Exception:
                pass


class ReviewButtons(ui.View):
    def __init__(self, guild_id: int, char_id: int):
        super().__init__(timeout=None)
        self.guild_id = guild_id
        self.char_id = char_id

        approve = ui.Button(
            label="Approve",
            style=discord.ButtonStyle.success,
            custom_id=f"char:approve:{guild_id}:{char_id}"
        )
        reject = ui.Button(
            label="Reject",
            style=discord.ButtonStyle.danger,
            custom_id=f"char:reject:{guild_id}:{char_id}"
        )
        approve.callback = self._approve_cb
        reject.callback = self._reject_cb
        self.add_item(approve)
        self.add_item(reject)

    async def _approve_cb(self, interaction: discord.Interaction):
        if not interaction.guild:
            return await interaction.response.send_message("Use this in a server.", ephemeral=True)

        settings = await DB.get_settings(interaction.guild_id)  # type: ignore
        if not isinstance(interaction.user, discord.Member) or not is_reviewer(interaction.user, settings):
            return await interaction.response.send_message("You can’t approve this.", ephemeral=True)

        await DB.set_status(self.guild_id, self.char_id, "approved", interaction.user.id, None)
        row = await DB.get_character(self.guild_id, self.char_id)
        # Remove buttons from the review message
        await interaction.response.edit_message(embed=char_embed(row), view=None)
        # Clean up mapping so we don't try to reattach on reboot
        try:
            await DB.delete_review_message(self.guild_id, interaction.message.id)  # type: ignore
        except Exception:
            pass
        # Notify
        try:
            await interaction.followup.send(f"✅ Approved character **#{self.char_id}**.", ephemeral=True)
            if row:
                owner = interaction.guild.get_member(row["owner_id"])
                if owner:
                    await owner.send(f"Your character **{row['name']}** (ID {self.char_id}) was approved!")
        except Exception:
            pass

    async def _reject_cb(self, interaction: discord.Interaction):
        if not interaction.guild:
            return await interaction.response.send_message("Use this in a server.", ephemeral=True)

        settings = await DB.get_settings(interaction.guild_id)  # type: ignore
        if not isinstance(interaction.user, discord.Member) or not is_reviewer(interaction.user, settings):
            return await interaction.response.send_message("You can’t reject this.", ephemeral=True)

        # Show modal to capture reason; pass identifiers along
        await interaction.response.send_modal(RejectModal(self.guild_id, self.char_id, review_message_id=interaction.message.id))  # type: ignore

class RejectModal(ui.Modal, title="Reject Character"):
    reason = ui.TextInput(label="Reason (optional)", style=discord.TextStyle.paragraph, required=False)

    def __init__(self, guild_id: int, char_id: int, review_message_id: int):
        super().__init__(timeout=300)
        self.guild_id = guild_id
        self.char_id = char_id
        self.review_message_id = review_message_id

    async def on_submit(self, interaction: discord.Interaction):
        if not interaction.guild:
            return await interaction.response.send_message("Use this in a server.", ephemeral=True)

        settings = await DB.get_settings(interaction.guild_id)  # type: ignore
        if not isinstance(interaction.user, discord.Member) or not is_reviewer(interaction.user, settings):
            return await interaction.response.send_message("You can’t reject this.", ephemeral=True)

        await DB.set_status(self.guild_id, self.char_id, "rejected", interaction.user.id, str(self.reason) or None)
        row = await DB.get_character(self.guild_id, self.char_id)
        await interaction.response.edit_message(embed=char_embed(row), view=None)

        # Clean up mapping so we don't try to reattach on reboot
        try:
            await DB.delete_review_message(self.guild_id, self.review_message_id)
        except Exception:
            pass

        try:
            if row:
                owner = interaction.guild.get_member(row["owner_id"])
                if owner:
                    await owner.send(
                        f"Your character **{row['name']}** (ID {self.char_id}) was rejected.\n"
                        f"Reason: {row['decision_reason'] or '—'}"
                    )
        except Exception:
            pass

class Characters(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.bot.loop.create_task(self.restore_review_views())

    async def restore_review_views(self):
        await self.bot.wait_until_ready()
        print("[restore_review_views] Running...")
        for guild in self.bot.guilds:
            try:
                if not hasattr(DB, "list_review_messages"):
                    print(f"[restore_review_views] DB.list_review_messages missing for guild {guild.id}")
                    continue
                review_msgs = await DB.list_review_messages(guild.id)
                print(f"[restore_review_views] Found {len(review_msgs)} review messages for guild {guild.id}")
                for msg_info in review_msgs:
                    channel = guild.get_channel(msg_info['channel_id'])
                    if not channel:
                        print(f"[restore_review_views] Channel {msg_info['channel_id']} not found in guild {guild.id}")
                        continue
                    try:
                        msg = await channel.fetch_message(msg_info['message_id'])
                        view = ReviewButtons(guild.id, msg_info['char_id'])
                        await msg.edit(view=view)
                        print(f"[restore_review_views] Restored view for message {msg_info['message_id']} in channel {msg_info['channel_id']}")
                    except Exception as e:
                        print(f"[restore_review_views] Failed to restore view for message {msg_info['message_id']}: {e}")
            except Exception as e:
                print(f"[restore_review_views] Error for guild {guild.id}: {e}")

    @app_commands.command(name="apply", description="Apply for a character (admin review required).")
    async def apply(self, interaction: discord.Interaction):
        if not interaction.guild:
            return await interaction.response.send_message("Use this in a server.", ephemeral=True)
        form = await DB.get_form(interaction.guild_id)  # type: ignore
        await interaction.response.send_modal(ApplyModal(self.bot, interaction.guild_id, form))  # type: ignore

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
            return await interaction.response.send_message(embed=char_embed(dict(row)), ephemeral=True)
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

async def setup(bot: commands.Bot):
    await bot.add_cog(Characters(bot))
