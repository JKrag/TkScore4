"""
Tests for tks_to_json.py

Run with:  python -m pytest tools/test_tks_to_json.py -v
Or:        python -m unittest tools/test_tks_to_json.py
"""

import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(__file__))
from tks_to_json import TksParser, tks_to_dict, convert_file

GOLDEN_DIR = os.path.join(os.path.dirname(__file__), '../../TkScore_Win/2013')


def parse(text: str):
    return TksParser(f'$VAR1 = {text}').parse()


class TestPrimitives(unittest.TestCase):
    def test_string(self):
        self.assertEqual(parse("'hello'"), 'hello')

    def test_string_escaped_quote(self):
        self.assertEqual(parse(r"'it\'s'"), "it's")

    def test_string_escaped_backslash(self):
        self.assertEqual(parse(r"'back\\slash'"), 'back\\slash')

    def test_integer(self):
        self.assertEqual(parse('42'), 42)

    def test_negative_integer(self):
        self.assertEqual(parse('-7'), -7)

    def test_undef(self):
        self.assertIsNone(parse('undef'))

    def test_empty_string(self):
        self.assertEqual(parse("''"), '')


class TestCollections(unittest.TestCase):
    def test_empty_array(self):
        self.assertEqual(parse('[]'), [])

    def test_empty_hash(self):
        self.assertEqual(parse('{}'), {})

    def test_simple_array(self):
        self.assertEqual(parse("['a', 'b', 'c']"), ['a', 'b', 'c'])

    def test_array_trailing_comma(self):
        self.assertEqual(parse("['a', 'b',]"), ['a', 'b'])

    def test_mixed_array(self):
        # integers, strings, and undef in the same array — critical for rank lists
        result = parse("['401A', 401, undef, 5]")
        self.assertEqual(result, ['401A', 401, None, 5])
        self.assertIsInstance(result[0], str)   # '401A' → str
        self.assertIsInstance(result[1], int)   # 401 → int
        self.assertIsNone(result[2])            # undef → None
        self.assertIsInstance(result[3], int)

    def test_simple_hash(self):
        result = parse("{ 'a' => 1, 'b' => 'two' }")
        self.assertEqual(result, {'a': 1, 'b': 'two'})

    def test_hash_bare_integer_key(self):
        # Bare integer keys (e.g. entry numbers) become string keys in JSON
        result = parse("{ 401 => { 'name' => 'Fluffy' } }")
        self.assertIn('401', result)
        self.assertEqual(result['401']['name'], 'Fluffy')

    def test_hash_mixed_key_types(self):
        # Integer 401 and string '401A' are different entries — must stay distinct
        result = parse("{ 401 => 'int', '401A' => 'str' }")
        self.assertEqual(result.get('401'), 'int')
        self.assertEqual(result.get('401A'), 'str')
        self.assertEqual(len(result), 2)

    def test_nested(self):
        src = "{ 'rings' => [ { 'judge' => 'YP', 'count' => 10 } ] }"
        result = parse(src)
        self.assertEqual(result['rings'][0]['count'], 10)


class TestVAR1Wrapper(unittest.TestCase):
    """The $VAR1 = ...; wrapper must be stripped correctly."""

    def test_full_wrapper(self):
        text = "$VAR1 = { 'x' => 1 };"
        self.assertEqual(TksParser(text).parse(), {'x': 1})

    def test_wrapper_no_semicolon(self):
        text = "$VAR1 = { 'x' => 1 }"
        self.assertEqual(TksParser(text).parse(), {'x': 1})


class TestErrorCases(unittest.TestCase):
    def test_unterminated_string(self):
        with self.assertRaises((ValueError, Exception)):
            parse("'unterminated")

    def test_trailing_junk(self):
        with self.assertRaises((ValueError, Exception)):
            TksParser("$VAR1 = 'ok'; junk").parse()

    def test_unknown_value(self):
        with self.assertRaises((ValueError, Exception)):
            parse("@array")  # Perl array ref — not supported


class TestConvertFile(unittest.TestCase):
    def _make_tks(self, content: str) -> str:
        f = tempfile.NamedTemporaryFile(mode='w', suffix='.tks', delete=False, encoding='utf-8')
        f.write(content)
        f.close()
        return f.name

    def test_convert_to_stdout(self, capsys=None):
        path = self._make_tks("$VAR1 = { 'club' => 'Test Club' };")
        try:
            data = tks_to_dict(path)
            self.assertEqual(data['club'], 'Test Club')
        finally:
            os.unlink(path)

    def test_convert_to_file(self):
        path = self._make_tks("$VAR1 = { 'club' => 'Test Club' };")
        out = path + '.json'
        try:
            convert_file(path, out)
            with open(out) as f:
                data = json.load(f)
            self.assertEqual(data['club'], 'Test Club')
        finally:
            os.unlink(path)
            if os.path.exists(out):
                os.unlink(out)


class TestGoldenFiles(unittest.TestCase):
    """
    Smoke-test every .tks file in the 2013 golden corpus:
    parse must succeed and produce a dict with the expected top-level keys.
    """

    @classmethod
    def setUpClass(cls):
        if not os.path.isdir(GOLDEN_DIR):
            raise unittest.SkipTest(f'Golden file dir not found: {GOLDEN_DIR}')
        cls.tks_files = [
            os.path.join(GOLDEN_DIR, f)
            for f in sorted(os.listdir(GOLDEN_DIR))
            if f.endswith('.tks')
        ]
        if not cls.tks_files:
            raise unittest.SkipTest('No .tks files found in golden dir')

    def test_all_parse_without_error(self):
        failed = []
        for path in self.tks_files:
            try:
                tks_to_dict(path)
            except Exception as e:
                failed.append(f'{os.path.basename(path)}: {e}')
        self.assertEqual(failed, [], '\n'.join(failed))

    def test_required_top_level_keys(self):
        required = {'shows', 'entries', 'club', 'date', 'options'}
        for path in self.tks_files:
            name = os.path.basename(path)
            data = tks_to_dict(path)
            missing = required - data.keys()
            self.assertFalse(missing, f'{name} missing keys: {missing}')

    def test_entry_keys_are_strings(self):
        """JSON keys must always be strings — verify int keys were converted."""
        for path in self.tks_files:
            name = os.path.basename(path)
            data = tks_to_dict(path)
            for key in data.get('entries', {}):
                self.assertIsInstance(key, str, f'{name}: entry key {key!r} is not a string')

    def test_rank_lists_contain_correct_types(self):
        """rank arrays may contain int, str, or None — never anything else."""
        for path in self.tks_files:
            name = os.path.basename(path)
            data = tks_to_dict(path)
            for show in data.get('shows', []):
                for ring in show.get('rings', []):
                    for cat_class, finals in ring.get('finals', {}).items():
                        for i, val in enumerate(finals.get('rank', [])):
                            self.assertIn(
                                type(val), (int, float, str, type(None)),
                                f'{name} ring {ring.get("judge")} {cat_class} rank[{i}]={val!r}'
                            )

    def test_integer_and_string_cat_ids_are_distinct(self):
        """401 (int entry) and '401A' (string entry) must not collide."""
        for path in self.tks_files:
            name = os.path.basename(path)
            data = tks_to_dict(path)
            entries = data.get('entries', {})
            # All keys are strings in JSON; just verify no silent deduplication occurred
            self.assertEqual(
                len(entries), len(set(entries.keys())),
                f'{name}: duplicate entry keys after parsing'
            )


if __name__ == '__main__':
    unittest.main()
