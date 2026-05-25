#!/usr/bin/env python3
"""
Convert TkScore .tks files (Perl Data::Dumper format) to JSON.

.tks files are serialized by Perl's Data::Dumper as:
    $VAR1 = { ... };

Key format details:
  - Hash keys are single-quoted strings OR bare integers
  - Values are single-quoted strings, bare integers, undef (-> null),
    nested hashes {}, or arrays []
  - Single quotes inside strings are escaped as \'
  - Cat numbers like 401 (int) and '401A' (str) are distinct — preserved in JSON

Usage:
    python tools/tks_to_json.py path/to/show.tks           # prints to stdout
    python tools/tks_to_json.py path/to/show.tks out.json  # writes file
    python tools/tks_to_json.py --batch ../TkScore_Win/2013/ out/  # convert all .tks in dir
"""

import re
import sys
import json
import os
from typing import Any


class TksParser:
    def __init__(self, text: str):
        # Strip $VAR1 = prefix and trailing semicolon
        text = text.strip()
        text = re.sub(r'^\$VAR\d+\s*=\s*', '', text)
        if text.endswith(';'):
            text = text[:-1]
        self.text = text
        self.pos = 0

    # --- low-level helpers ---

    def _skip_ws(self):
        while self.pos < len(self.text) and self.text[self.pos] in ' \t\n\r':
            self.pos += 1

    def _peek(self) -> str:
        self._skip_ws()
        return self.text[self.pos] if self.pos < len(self.text) else ''

    def _consume(self, expected: str):
        self._skip_ws()
        if not self.text[self.pos:].startswith(expected):
            ctx = self.text[max(0, self.pos - 30):self.pos + 30]
            raise ValueError(
                f"Expected {expected!r} at pos {self.pos}\n  context: ...{ctx}..."
            )
        self.pos += len(expected)

    # --- value parsers ---

    def _parse_string(self) -> str:
        self._consume("'")
        parts: list[str] = []
        while self.pos < len(self.text):
            ch = self.text[self.pos]
            if ch == '\\' and self.pos + 1 < len(self.text):
                nxt = self.text[self.pos + 1]
                parts.append("'" if nxt == "'" else ('\\' if nxt == '\\' else ('\\' + nxt)))
                self.pos += 2
            elif ch == "'":
                self.pos += 1
                return ''.join(parts)
            else:
                parts.append(ch)
                self.pos += 1
        raise ValueError("Unterminated string literal")

    def _parse_number(self) -> int | float:
        self._skip_ws()
        m = re.match(r'-?\d+(?:\.\d+)?', self.text[self.pos:])
        if not m:
            raise ValueError(f"Expected number at pos {self.pos}")
        self.pos += len(m.group())
        s = m.group()
        return float(s) if '.' in s else int(s)

    def _parse_key(self) -> str:
        """Hash key: quoted string or bare integer (converted to string for JSON)."""
        self._skip_ws()
        if self.text[self.pos] == "'":
            return self._parse_string()
        num = self._parse_number()
        return str(int(num))

    def _parse_hash(self) -> dict:
        self._consume('{')
        result: dict = {}
        while True:
            self._skip_ws()
            if self._peek() == '}':
                self._consume('}')
                return result
            key = self._parse_key()
            self._consume('=>')
            result[key] = self._parse_value()
            self._skip_ws()
            if self._peek() == ',':
                self._consume(',')

    def _parse_array(self) -> list:
        self._consume('[')
        result: list = []
        while True:
            self._skip_ws()
            if self._peek() == ']':
                self._consume(']')
                return result
            result.append(self._parse_value())
            self._skip_ws()
            if self._peek() == ',':
                self._consume(',')

    def _parse_value(self) -> Any:
        self._skip_ws()
        if self.pos >= len(self.text):
            raise ValueError("Unexpected end of input")
        ch = self.text[self.pos]
        if ch == '{':
            return self._parse_hash()
        if ch == '[':
            return self._parse_array()
        if ch == "'":
            return self._parse_string()
        if self.text[self.pos:self.pos + 5] == 'undef':
            self.pos += 5
            return None
        if ch == '-' or ch.isdigit():
            return self._parse_number()
        ctx = self.text[max(0, self.pos - 20):self.pos + 20]
        raise ValueError(f"Unexpected character {ch!r} at pos {self.pos}: ...{ctx}...")

    def parse(self) -> Any:
        value = self._parse_value()
        self._skip_ws()
        if self.pos != len(self.text):
            raise ValueError(
                f"Trailing content at pos {self.pos}: {self.text[self.pos:self.pos + 40]!r}"
            )
        return value


# --- public API ---

def tks_to_dict(path: str) -> dict:
    for enc in ('utf-8', 'cp1252', 'latin-1'):
        try:
            with open(path, 'r', encoding=enc) as f:
                content = f.read()
            return TksParser(content).parse()
        except UnicodeDecodeError:
            continue
    raise ValueError(f"Cannot decode {path} with utf-8, cp1252, or latin-1")


def convert_file(src: str, dst: str | None = None) -> dict:
    data = tks_to_dict(src)
    out = json.dumps(data, indent=2, ensure_ascii=False)
    if dst:
        with open(dst, 'w', encoding='utf-8') as f:
            f.write(out)
    else:
        print(out)
    return data


def convert_batch(src_dir: str, dst_dir: str):
    os.makedirs(dst_dir, exist_ok=True)
    tks_files = [f for f in os.listdir(src_dir) if f.endswith('.tks')]
    if not tks_files:
        print(f"No .tks files found in {src_dir}", file=sys.stderr)
        return
    ok = fail = 0
    for fname in sorted(tks_files):
        src = os.path.join(src_dir, fname)
        dst = os.path.join(dst_dir, fname.replace('.tks', '.json'))
        try:
            convert_file(src, dst)
            print(f"  OK  {fname} -> {os.path.basename(dst)}")
            ok += 1
        except Exception as e:
            print(f"  ERR {fname}: {e}", file=sys.stderr)
            fail += 1
    print(f"\n{ok} converted, {fail} failed.")


# --- CLI ---

def main():
    args = sys.argv[1:]
    if not args or args[0] in ('-h', '--help'):
        print(__doc__)
        sys.exit(0)

    if args[0] == '--batch':
        if len(args) < 3:
            print("Usage: tks_to_json.py --batch <src_dir> <dst_dir>", file=sys.stderr)
            sys.exit(1)
        convert_batch(args[1], args[2])
    else:
        src = args[0]
        dst = args[1] if len(args) >= 2 else None
        try:
            convert_file(src, dst)
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)


if __name__ == '__main__':
    main()
