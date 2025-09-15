import discord, aiohttp
from discord.ext import commands
from discord import app_commands
from utils.colors import parse_color
from utils.storage import JsonStore

NB, EN, EM, THIN = "\u00A0", "\u2002", "\u2003", "\u2009"
STORE = JsonStore("webhooks.json")

def clamp(text: str | None, n: int) -> str | None:
    if not text: return text
    return text if len(text) <= n else text[:n] + "…"

class RpCards(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # ---------- Normal (posted as the bot) ----------
    @app_commands.command(name="rp_instagram", description="Instagram-style card (posted as the bot).")
    @app_commands.describe(username="Display name", image_url="Main image URL",
                           song="Now playing (optional)", artist="Artist (optional)",
                           description="One-line caption", color="Hex (#5b6770) or decimal")
    async def rp_instagram(self, inter: discord.Interaction, username: str, image_url: str,
                           song: str | None = None, artist: str | None = None,
                           description: str | None = None, color: str | int | None = None):
        c = parse_color(color, 0x5B6770)
        np = f"\n{THIN}———{EN}*now playing*{EN}**{clamp(song,50)}**{EN}by{EN}*{clamp(artist,50)}*" if song and artist else ""
        header = f"📸{EN}**{username}**{EN}just{EN}updated{EN}their{EN}feed{np}"

        top = discord.Embed(description=header, color=c)
        mid = discord.Embed(color=c); mid.set_image(url=image_url)
        cap = clamp(description or "", 140)
        bottom = discord.Embed(description=f"**{username}**{EM}{cap}" if cap else f"**{username}**", color=c)

        await inter.response.send_message(embeds=[top, mid, bottom], allowed_mentions=discord.AllowedMentions.none())

    @app_commands.command(name="rp_spotify", description="Spotify-style now playing (posted as the bot).")
    @app_commands.describe(username="Display name", song="Song", artist="Artist",
                           cover_url="Cover image URL", progress="2:22", duration="3:19",
                           color="Hex or decimal color")
    async def rp_spotify(self, inter: discord.Interaction, username: str, song: str, artist: str,
                         cover_url: str, progress: str | None = None, duration: str | None = None,
                         color: str | int | None = None):
        c = parse_color(color, 0x5B6770)
        header = f"🎧{EN}{NB}{username}{EN}is{EN}listening{EN}to{EN}…"
        body = [f"**{clamp(song,70)}**", f"*{clamp(artist,80)}*"]
        if progress and duration: body.append(f"{progress}{EN}—{EN}{duration}")
        top = discord.Embed(description=header, color=c)
        main = discord.Embed(description="\n".join(body), color=c); main.set_image(url=cover_url)
        await inter.response.send_message(embeds=[top, main], allowed_mentions=discord.AllowedMentions.none())

    # ---------- Post AS someone (via webhook) ----------
    async def _send_via_webhook(self, channel_id: int, *, username=None, avatar_url=None,
                                embeds: list[discord.Embed] | None = None, content: str | None = None):
        url = STORE.get(str(channel_id))
        if not url:
            raise RuntimeError("No webhook set for this channel. Use /setwebhook first.")
        async with aiohttp.ClientSession() as s:
            wh = discord.Webhook.from_url(url, session=s)
            await wh.send(content=content, username=username, avatar_url=avatar_url,
                          embeds=embeds, allowed_mentions=discord.AllowedMentions.none(), wait=True)

    @app_commands.command(name="rp_instagram_as", description="Instagram-style card posted AS a custom name/avatar.")
    @app_commands.describe(poster_name="Webhook display name", poster_avatar="Webhook avatar URL",
                           username="Displayed Instagram username text", image_url="Main image URL",
                           song="Now playing (optional)", artist="Artist (optional)",
                           description="One-line caption", color="Hex or decimal color")
    async def rp_instagram_as(self, inter: discord.Interaction, poster_name: str, poster_avatar: str,
                              username: str, image_url: str, song: str | None = None,
                              artist: str | None = None, description: str | None = None,
                              color: str | int | None = None):
        c = parse_color(color, 0x5B6770)
        np = f"\n{THIN}———{EN}*now playing*{EN}**{clamp(song,50)}**{EN}by{EN}*{clamp(artist,50)}*" if song and artist else ""
        header = f"📸{EN}**{username}**{EN}just{EN}updated{EN}their{EN}feed{np}"
        top = discord.Embed(description=header, color=c)
        mid = discord.Embed(color=c); mid.set_image(url=image_url)
        cap = clamp(description or "", 140)
        bottom = discord.Embed(description=f"**{username}**{EM}{cap}" if cap else f"**{username}**", color=c)

        await inter.response.defer(ephemeral=True)
        try:
            await self._send_via_webhook(inter.channel_id, username=poster_name, avatar_url=poster_avatar,
                                         embeds=[top, mid, bottom])
            await inter.followup.send("✅ Sent.", ephemeral=True)
        except Exception as e:
            await inter.followup.send(f"❌ {e}", ephemeral=True)

    @app_commands.command(name="rp_spotify_as", description="Spotify-style card posted AS a custom name/avatar.")
    @app_commands.describe(poster_name="Webhook display name", poster_avatar="Webhook avatar URL",
                           username="Displayed name in card", song="Song", artist="Artist",
                           cover_url="Cover URL", progress="2:22", duration="3:19",
                           color="Hex or decimal color")
    async def rp_spotify_as(self, inter: discord.Interaction, poster_name: str, poster_avatar: str,
                            username: str, song: str, artist: str, cover_url: str,
                            progress: str | None = None, duration: str | None = None,
                            color: str | int | None = None):
        c = parse_color(color, 0x5B6770)
        header = f"🎧{EN}{NB}{username}{EN}is{EN}listening{EN}to{EN}…"
        body = [f"**{clamp(song,70)}**", f"*{clamp(artist,80)}*"]
        if progress and duration: body.append(f"{progress}{EN}—{EN}{duration}")
        top = discord.Embed(description=header, color=c)
        main = discord.Embed(description="\n".join(body), color=c); main.set_image(url=cover_url)

        await inter.response.defer(ephemeral=True)
        try:
            await self._send_via_webhook(inter.channel_id, username=poster_name, avatar_url=poster_avatar,
                                         embeds=[top, main])
            await inter.followup.send("✅ Sent.", ephemeral=True)
        except Exception as e:
            await inter.followup.send(f"❌ {e}", ephemeral=True)

async def setup(bot: commands.Bot):
    await bot.add_cog(RpCards(bot))
