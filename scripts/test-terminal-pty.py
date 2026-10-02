"""Exercise actual CLI editing keys in a POSIX pseudo-terminal; no provider calls."""
import fcntl
import json
import os
from pathlib import Path
import pty
import re
import select
import shutil
import struct
import subprocess
import sys
import tempfile
import termios
import time

ROOT = Path(__file__).resolve().parent.parent
NODE = sys.argv[1]
project = Path(tempfile.mkdtemp(prefix='repi-input-pty-'))


class Terminal:
    def __init__(self, args, env=None):
        self.master, slave = pty.openpty()
        fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 30, 90, 0, 0))
        settings = dict(os.environ, TERM='xterm-256color', RESEARCH_PI_DATA_DIR=str(project / 'data'))
        settings.pop('NO_COLOR', None)
        settings.update(env or {})
        self.process = subprocess.Popen([NODE, *args], stdin=slave, stdout=slave, stderr=slave, env=settings, cwd=ROOT)
        os.close(slave)
        self.buffer = ''

    def send(self, text):
        # Separate Tab keystrokes: readline intentionally treats grouped bytes as paste.
        parts = text.split('\t')
        for index, part in enumerate(parts):
            if part:
                os.write(self.master, part.encode())
            if index < len(parts) - 1:
                time.sleep(0.05)
                os.write(self.master, b'\t')
                time.sleep(0.05)

    def wait(self, text, start=0, at_end=False):
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            plain = re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]', '', self.buffer[start:])
            if (plain.endswith(text) if at_end else text in plain):
                return plain
            ready, _, _ = select.select([self.master], [], [], 0.1)
            if ready:
                try:
                    chunk = os.read(self.master, 65536)
                except OSError:
                    break
                if not chunk:
                    break
                self.buffer += chunk.decode(errors='replace')
        raise AssertionError('Expected terminal marker: ' + text)

    def prompt(self, start=0):
        self.wait('repi ❯ ', start, at_end=True)

    def finish(self):
        assert self.process.wait(timeout=10) == 0

    def close(self):
        if self.process.poll() is None:
            self.process.kill()
            self.process.wait()
        os.close(self.master)


try:
    args = [str(ROOT / 'dist/cli.js'), '--project', str(project), '--offline', '--plain']
    first = Terminal(args)
    try:
        first.prompt()
        start = len(first.buffer)
        first.send('/h\t\r')
        first.wait('Show commands', start)
        first.prompt(start)
        start = len(first.buffer)
        first.send('/mo\t\t')
        first.wait('/models', start)  # Ambiguous completion lists matches, without submitting.
        first.wait('/model', start)
        first.send('\x15')  # Ctrl+U clears the unfinished line.
        start = len(first.buffer)
        first.send('/reasoning o\t\t')
        first.wait('/reasoning on', start)
        first.wait('/reasoning off', start)
        first.send('\x15')
        start = len(first.buffer)
        first.send('/connect off\t\r')
        first.wait('Active connection: researchpi-mock/offline-test', start)
        first.prompt(start)
        start = len(first.buffer)
        first.send('/thinking o\t\r')
        first.wait('Reasoning effort: off', start)
        first.prompt(start)
        start = len(first.buffer)
        first.send('/model offline-\t\r')
        first.wait('Active connection: researchpi-mock/offline-test', start)
        first.prompt(start)
        # The picker has its own ID completions and does not inherit chat history.
        start = len(first.buffer)
        first.send('/model\r')
        first.wait('Option [1]:', start)
        first.send('offline-\t\r')
        first.wait('Active connection: researchpi-mock/offline-test', start)
        first.prompt(start)
        for message in ['first research question', 'second research question']:
            start = len(first.buffer)
            first.send(message + '\r')
            first.wait('SDK session, scientific resource and tools loaded.', start)
            first.prompt(start)
        # Up traverses backward; Down moves forward before submission.
        start = len(first.buffer)
        first.send('\x1b[A\x1b[A\x1b[B\r')
        first.wait('SDK session, scientific resource and tools loaded.', start)
        first.prompt(start)
        start = len(first.buffer)
        first.send(' do not remember this line\r')
        first.wait('SDK session, scientific resource and tools loaded.', start)
        first.prompt(start)
        first.send('/exit\r')
        first.finish()
        assert 'Unknown command' not in first.buffer
    finally:
        first.close()

    history_file = project / '.research-pi/input-history.json'
    history = json.loads(history_file.read_text())
    assert history[0] == '/exit'
    assert history[1] == 'second research question'
    assert 'first research question' in history
    assert '/help' in history and '/thinking off' in history
    assert '/model offline-test' in history
    assert 'offline-test' not in history  # Picker answer is not chat input.
    assert not any('do not remember' in value for value in history)
    assert history.count('second research question') == 1
    assert history_file.stat().st_mode & 0o777 == 0o600

    second = Terminal(args)
    try:
        second.prompt()
        start = len(second.buffer)
        second.send('\x1b[A\x1b[A\r')  # Restore prior second question, not a setup response.
        second.wait('SDK session, scientific resource and tools loaded.', start)
        second.prompt(start)
        # Go backward from a draft and forward to recover it.
        start = len(second.buffer)
        second.send('first research \x1b[A\x1b[B\r')
        second.wait('SDK session, scientific resource and tools loaded.', start)
        second.prompt(start)
        second.send('/exit\r')
        second.finish()
    finally:
        second.close()
    assert 'first research ' in json.loads(history_file.read_text())
    session = Path(json.loads((project / '.research-pi/session-pointer.json').read_text())['path'])
    messages = [json.loads(line) for line in session.read_text().splitlines()]
    user_text = [entry['message']['content'] for entry in messages if entry.get('type') == 'message' and entry['message'].get('role') == 'user']
    flattened = [item if isinstance(item, str) else ''.join(part.get('text', '') for part in item) for item in user_text]
    assert flattened.count('second research question') == 3
    assert 'first research' in flattened

    # Verify hidden entry cannot be completed, echoed or recovered by Up.
    fixture = project / 'secret-entry.mjs'
    fixture.write_text("import {terminalUI} from " + json.dumps((ROOT / 'dist/terminal.js').as_uri()) + ";\n"
        "const ui=terminalUI(undefined,{project:process.argv[2]});\n"
        "try { const key=await ui.interaction.prompt({type:'secret',message:'Enter test key:'});\n"
        "if(key!=='synthetic-secret') throw new Error('Secret input mismatch');\n"
        "await ui.read('After secret ❯',{history:true,completer:line=>[['synthetic-secret'],line]});\n"
        "} finally { ui.close(); }\n")
    third = Terminal([str(fixture), str(project)])
    try:
        third.wait('Enter test key:')
        third.send('synthetic-secret\t\r')
        third.wait('After secret ❯')
        third.send('\x1b[A\r')
        third.finish()
        assert 'synthetic-secret' not in third.buffer
    finally:
        third.close()
    assert 'synthetic-secret' not in history_file.read_text()
    # Use the actual SDK model catalog for completion, with a fake local credential.
    env = dict(os.environ, RESEARCH_PI_DATA_DIR=str(project / 'data'), OPENCODE_API_KEY='synthetic-catalog-key')
    subprocess.run([NODE, str(ROOT / 'dist/cli.js'), '--project', str(project), 'config', '--provider', 'opencode-go', '--model', 'glm-5.3'], env=env, capture_output=True, check=True)
    fourth = Terminal([arg for arg in args if arg != '--offline'], {'OPENCODE_API_KEY': 'synthetic-catalog-key'})
    try:
        fourth.prompt()
        start = len(fourth.buffer)
        fourth.send('/model glm-5.3-f\t\r')
        fourth.wait('Active connection: opencode-go/glm-5.3-flash', start)
        fourth.prompt(start)
        fourth.send('/exit\r')
        fourth.finish()
    finally:
        fourth.close()
    print('PTY verified: unique/double Tab, command arguments, model picker, Up/Down, draft restoration, persistent history, private permissions, and secret exclusion.')
finally:
    shutil.rmtree(project)
