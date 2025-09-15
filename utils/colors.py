import re
def parse_color(value, fallback=0x5B6770) -> int:
    if value is None: return fallback
    if isinstance(value, int): return value
    s = str(value).strip()
    if s.isdigit(): return int(s)
    s = s.lstrip('#')
    return int(s, 16) if re.fullmatch(r'[0-9A-Fa-f]{6}', s) else fallback
