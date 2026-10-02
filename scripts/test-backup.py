"""Exercise the real backup shell script with deterministic fake external tools.

Tests ordering, pipe failures, corruption, retention and secret handling. These
do not claim to verify age cryptography, R2 connectivity or a production restore.
"""
import base64
import hashlib
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[1]
FAKE = r'''#!/usr/bin/env python3
import base64, fnmatch, hashlib, json, os, pathlib, shutil, sys
name = pathlib.Path(sys.argv[0]).name
a = sys.argv[1:]
root = pathlib.Path(os.environ["MOCK_REMOTE"])
def remote(s): return root / s.split(":", 1)[1]
if name == "id": print("0")
elif name in ("flock", "node"): pass
elif name == "stat":
    st = pathlib.Path(a[-1]).stat()
    print(format(st.st_mode & 0o777, "o") if a[1] == "%a" else st.st_size)
elif name == "sha256sum":
    print(hashlib.sha256(pathlib.Path(a[-1]).read_bytes()).hexdigest(), a[-1])
elif name == "runuser":
    if a[1] == "postgres":
        assert "--format=custom" in a and any(x.startswith("--snapshot=") for x in a)
        assert not any(x.startswith("--exclude-table-data") for x in a)
        assert "-f" not in a
        if os.environ.get("MOCK_DUMP_FAIL"): sys.exit(1)
        sys.stdout.buffer.write(b"PGDMP PRIVATE-ACCOUNT-ROW PRIVATE-FAMILY-ROW")
    else:
        print("00000001-00000002-1", flush=True)
        print(json.dumps({"counts": {"accounts.users": "1", "family.persons": "1"}}), flush=True)
        sys.stdin.readline()
elif name == "age":
    data = pathlib.Path(a[-1]).read_bytes() if a[-1].endswith(".json") else sys.stdin.buffer.read()
    pathlib.Path(a[a.index("-o") + 1]).write_bytes(b"age-fixture\n" + base64.b64encode(data))
elif name == "rclone":
    a = a[4:]
    command, a = a[0], a[1:]
    if command == "copyto":
        if os.environ.get("MOCK_UPLOAD_FAIL") or (os.environ.get("MOCK_MANIFEST_FAIL") and a[1].endswith(".manifest.age")): sys.exit(1)
        target = remote(a[1]); target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(a[0], target)
        if os.environ.get("MOCK_CORRUPT"): target.write_bytes(b"corrupt")
    elif command == "cat": sys.stdout.buffer.write(remote(a[0]).read_bytes())
    elif command == "lsf":
        for p in remote(a[-1]).iterdir():
            if fnmatch.fnmatch(p.name, "name_atlas-*.dump.age"): print(p.name)
    elif command == "deletefile": remote(a[0]).unlink(missing_ok=True)
    else: raise RuntimeError(command)
else: raise RuntimeError(name)
'''


class BackupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="nameatlas-backup-test-")
        self.root = Path(self.temp.name)
        binary = self.root / "bin"
        binary.mkdir()
        for name in ("id", "flock", "node", "stat", "sha256sum", "runuser", "age", "rclone"):
            p = binary / name
            p.write_text(FAKE)
            p.chmod(0o755)
        app = self.root / "app/ops/vm"
        app.mkdir(parents=True)
        (app / "backup-check.ts").touch()
        config = self.root / "rclone.conf"
        config.write_text("fixture-secret-never-printed")
        config.chmod(0o600)
        recipient = self.root / "recipient"
        recipient.write_text("age1fixturepublickey")
        self.env = dict(os.environ, PATH=f"{binary}:{os.environ['PATH']}",
            BACKUP_APP=str(self.root / "app"), BACKUP_STATE=str(self.root / "state"),
            BACKUP_RCLONE_CONFIG=str(config), BACKUP_RECIPIENT_FILE=str(recipient),
            BACKUP_R2_BUCKET="fixture-bucket", MOCK_REMOTE=str(self.root / "remote"))
        self.remote = self.root / "remote/fixture-bucket/name-atlas"
        self.remote.mkdir(parents=True)

    def tearDown(self):
        self.temp.cleanup()

    def run_backup(self, **flags):
        result = subprocess.run(["bash", str(REPO / "ops/vm/backup.sh")], env=dict(self.env, **flags),
            text=True, capture_output=True, timeout=20)
        self.assertNotIn("fixture-secret-never-printed", result.stdout + result.stderr)
        self.assertNotIn("age1fixturepublickey", result.stdout + result.stderr)
        self.assertEqual(list((self.root / "state").glob("run.*")), [])
        return result

    def old_backup(self, day):
        name = f"name_atlas-202601{day:02}T000000Z-{'a' * 64}.dump.age"
        (self.remote / name).write_bytes(b"previous verified fixture")
        (self.remote / (name + ".manifest.age")).write_bytes(b"previous manifest")
        return name

    def test_complete_encrypted_dump_and_manifest(self):
        result = self.run_backup()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        obj = (self.root / "state/latest").read_text().strip()
        encrypted = (self.remote / obj).read_bytes()
        self.assertNotIn(b"PRIVATE-ACCOUNT-ROW", encrypted)
        self.assertIn(b"PRIVATE-ACCOUNT-ROW", base64.b64decode(encrypted.split(b"\n", 1)[1]))
        self.assertIn(b"PRIVATE-FAMILY-ROW", base64.b64decode(encrypted.split(b"\n", 1)[1]))
        self.assertIn(hashlib.sha256(encrypted).hexdigest(), obj)
        self.assertTrue((self.remote / (obj + ".manifest.age")).exists())

    def test_dump_failure_uploads_nothing(self):
        result = self.run_backup(MOCK_DUMP_FAIL="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(list(self.remote.iterdir()), [])

    def test_upload_failure_preserves_old_backup(self):
        old = self.old_backup(1)
        result = self.run_backup(MOCK_UPLOAD_FAIL="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue((self.remote / old).exists())

    def test_readback_corruption_preserves_old_backup(self):
        old = self.old_backup(1)
        result = self.run_backup(MOCK_CORRUPT="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue((self.remote / old).exists())
        self.assertFalse((self.root / "state/latest").exists())

    def test_manifest_failure_removes_only_incomplete_new_copy(self):
        old = self.old_backup(1)
        result = self.run_backup(MOCK_MANIFEST_FAIL="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(set(p.name for p in self.remote.iterdir()), {old, old + ".manifest.age"})

    def test_retains_three_only_after_verification(self):
        old = [self.old_backup(day) for day in range(1, 5)]
        unrelated = self.remote / "another-project.dump.age"
        unrelated.write_bytes(b"leave untouched")
        result = self.run_backup()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(len(list(self.remote.glob("name_atlas-*.dump.age"))), 3)
        self.assertFalse((self.remote / old[0]).exists())
        self.assertTrue(unrelated.exists())


if __name__ == "__main__":
    unittest.main()
