import json, os, threading

class JsonStore:
    def __init__(self, path="webhooks.json"):
        self.path = path
        self.lock = threading.Lock()
        if not os.path.exists(self.path):
            with open(self.path, "w", encoding="utf-8") as f: f.write("{}")

    def read(self) -> dict:
        with self.lock, open(self.path, "r", encoding="utf-8") as f:
            return json.load(f)

    def write(self, data: dict):
        with self.lock, open(self.path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def get(self, key, default=None):
        return self.read().get(key, default)

    def set(self, key, value):
        data = self.read()
        data[key] = value
        self.write(data)
