import re

def parse_color(value: str | None, fallback: int = 0x5B6770) -> int:
    """Accept '#RRGGBB', 'RRGGBB', or decimal string; return int."""
    if not value:
        return fallback
    s = value.strip()
    if s.isdigit():
        return int(s)
    s = s.lstrip('#')
    return int(s, 16) if re.fullmatch(r'[0-9A-Fa-f]{6}', s) else fallback
