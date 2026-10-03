"""Exercise the actual native Pi /copy command and Ctrl+X through a PTY."""
import fcntl
import json
import os
from pathlib import Path
import pty
import select
import shutil
import struct
import subprocess
import sys
import tempfile
import termios
import time

root = Path(__file__).resolve().parent.parent
project = Path(tempfile.mkdtemp(prefix="repi-clipboard-probe-"))
data = project / "data"
helper = data / "clipboard/usr/bin/wl-copy"
helper.parent.mkdir(parents=True)
record = project / "copied.jsonl"
# A desktop-backend fixture receives the exact bytes from Pi's real clipboard path.
helper.write_text("#!" + sys.argv[1] + "\n"
    "import {appendFileSync} from 'node:fs'; let text='';"
    "process.stdin.setEncoding('utf8'); process.stdin.on('data',s=>text+=s);"
    "process.stdin.on('end',()=>appendFileSync(process.env.REPI_COPY_RECORD,JSON.stringify(text)+'\\n'));\n")
helper.chmod(0o755)
env = dict(os.environ, TERM="xterm-256color", PI_OFFLINE="1",
    DISPLAY="", WAYLAND_DISPLAY="repi-fixture", RESEARCH_PI_DATA_DIR=str(data),
    REPI_COPY_RECORD=str(record), PATH="/usr/bin:/bin")
master, slave = pty.openpty()
fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", 30, 110, 0, 0))
process = subprocess.Popen([sys.argv[1], str(root / "dist/cli.js"), "--project",
    str(project), "--offline"], cwd=root, env=env, stdin=slave, stdout=slave, stderr=slave)
os.close(slave)
output = ""

def wait_for(predicate, message):
    global output
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        if predicate():
            return
        if select.select([master], [], [], .05)[0]:
            try:
                output += os.read(master, 65536).decode(errors="replace")
            except OSError:
                break
    raise AssertionError(message + "\n" + output[-3000:])

def copies():
    return [json.loads(line) for line in record.read_text().splitlines()] if record.exists() else []

try:
    wait_for(lambda: "ResearchPi v" in output, "Native interface did not start")
    time.sleep(.2)
    os.write(master, b"hello\r")
    wait_for(lambda: "SDK session, scientific resource" in output, "Response missing")
    time.sleep(.2)
    os.write(master, b"/copy\r")
    wait_for(lambda: len(copies()) == 1, "Native /copy did not reach the desktop clipboard backend")
    time.sleep(.2)
    os.write(master, b"\x18")
    wait_for(lambda: len(copies()) == 2, "Ctrl+X did not reach the desktop clipboard backend")
    assert copies()[0] == copies()[1]
    assert "ResearchPi OFFLINE TEST" in copies()[0]
    time.sleep(.2)
    os.write(master, b"\x1b[<0;2;8M")
    os.write(master, b"\x1b[<32;24;8M")
    os.write(master, b"\x1b[<0;24;8m")
    wait_for(lambda: len(copies()) == 3, "Mouse selection did not reach the desktop clipboard backend")
    assert "ResearchPi OFFLINE" in copies()[2], copies()[2]
    os.write(master, b"/exit\r")
    assert process.wait(timeout=10) == 0
    print("Native clipboard verified: /copy, Ctrl+X and mouse selection write the actual assistant text.")
finally:
    if process.poll() is None:
        process.kill()
        process.wait()
    os.close(master)
    shutil.rmtree(project)
