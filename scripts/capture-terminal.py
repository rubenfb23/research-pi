"""Record the real native offline interface, render its final ANSI screen to SVG.

POSIX only; no provider account or desktop session is used. This is an actual
SDK interface capture with a deterministic offline response, not live reasoning.
"""
import fcntl
import html
import json
import os
from pathlib import Path
import pty
import re
import select
import struct
import subprocess
import sys
import tempfile
import termios
import time
import unicodedata

root = Path(__file__).resolve().parent.parent
columns, rows = 110, 30
with tempfile.TemporaryDirectory(prefix='researchpi-visual-') as directory:
    env = dict(os.environ, TERM='xterm-256color', PI_OFFLINE='1', RESEARCH_PI_DATA_DIR=directory+'/data')
    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', rows, columns, 0, 0))
    process = subprocess.Popen([sys.argv[1], str(root/'dist/cli.js'), '--project', directory, '--offline', '--new', 'Research workflow'],
                               cwd=root, env=env, stdin=slave, stdout=slave, stderr=slave)
    os.close(slave)
    start = time.monotonic()
    events = []
    output = ''
    def collect(seconds):
        global output
        until = time.monotonic()+seconds
        while time.monotonic()<until:
            if select.select([master], [], [], .05)[0]:
                try:
                    chunk = os.read(master, 65536).decode('utf-8', errors='replace')
                except OSError:
                    return
                output += chunk
                events.append([round(time.monotonic()-start, 3), 'o', chunk])
    try:
        collect(1.5)
        os.write(master, b'Help me start a reproducible study\r')
        collect(1.5)
        assert 'ResearchPi OFFLINE TEST' in output, 'Offline interface response missing'
        # Keep a real quiet terminal screen. Exit traffic is not part of the preview.
        captured = output
        os.write(master, b'/exit\r')
        collect(.5)
        process.wait(timeout=10)
    finally:
        if process.poll() is None:
            process.kill(); process.wait()
        os.close(master)

    # Normalize only the disposable path for a stable privacy-safe recording.
    events = [[t, kind, text.replace(directory, '/tmp/research-study')] for t, kind, text in events]
    captured = captured.replace(directory, '/tmp/research-study')
    header = {'version': 2, 'width': columns, 'height': rows, 'title': 'ResearchPi native interface (offline transport)',
              'env': {'TERM': 'xterm-256color'}, 'idle_time_limit': 1}
    (root/'assets/terminal.cast').write_text('\n'.join(json.dumps(item) for item in [header]+events)+'\n')

    # ANSI cursor/erase emulator. No styling is invented for assistant content.
    screen = [[' ']*columns for _ in range(rows)]
    x = y = 0
    token = re.compile(r'\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][\s\S]*?(?:\x07|\x1b\\)|\x1b[@-_]|[^\x1b]')
    for match in token.finditer(captured):
        c = match.group()
        if c.startswith('\x1b['):
            final = c[-1]; raw = c[2:-1]; params = [int(v) if v.isdigit() else 0 for v in raw.lstrip('?').split(';')]
            n = params[0] or 1
            if final in ('H','f'):
                y = min(rows-1, max(0, n-1)); x = min(columns-1, max(0, (params[1] if len(params)>1 else 1)-1))
            elif final == 'A': y = max(0, y-n)
            elif final == 'B': y = min(rows-1, y+n)
            elif final == 'C': x = min(columns-1, x+n)
            elif final == 'D': x = max(0, x-n)
            elif final == 'G': x = min(columns-1, n-1)
            elif final == 'J' and params[0] in (2,3): screen = [[' ']*columns for _ in range(rows)]
            elif final == 'J' and params[0] == 0:
                screen[y][x:] = [' ']*(columns-x)
                for line in range(y+1,rows): screen[line] = [' ']*columns
            elif final == 'K':
                if params[0] == 2: screen[y] = [' ']*columns
                elif params[0] == 1: screen[y][:x+1] = [' ']*(x+1)
                else: screen[y][x:] = [' ']*(columns-x)
            elif final == 'S':
                for _ in range(n): screen.pop(0);screen.append([' ']*columns)
        elif c.startswith('\x1b'): continue
        elif c == '\r': x = 0
        elif c == '\n':
            y += 1
            if y >= rows: screen.pop(0);screen.append([' ']*columns);y=rows-1
        elif c == '\b': x = max(0,x-1)
        elif c == '\t': x = min(columns-1, (x//8+1)*8)
        elif ord(c)>=32 and not unicodedata.combining(c):
            if x >= columns: x=0;y=min(rows-1,y+1)
            screen[y][x]=c;x += 2 if unicodedata.east_asian_width(c) in ('W','F') else 1
    lines = [''.join(line).rstrip() for line in screen]
    assert any('OFFLINE TEST' in line for line in lines), 'Final screenshot must include offline response'
    # Omit long stretches of unused screen rows for a compact README view.
    compact=[]
    for line in lines:
        if not line and compact and not compact[-1]:
            continue
        compact.append(line)
    lines=compact
    height=115+len(lines)*23
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="{height}" viewBox="0 0 1280 {height}" role="img" aria-labelledby="title desc">',
           '<title id="title">ResearchPi native terminal interface</title>',
           '<desc id="desc">Actual native SDK interface capture with deterministic offline transport. Empty screen rows compacted. No live model response is shown.</desc>',
           f'<rect width="1280" height="{height}" rx="20" fill="#102338"/>',
           '<circle cx="32" cy="30" r="6" fill="#ff9e9e"/><circle cx="53" cy="30" r="6" fill="#f0cf81"/><circle cx="74" cy="30" r="6" fill="#9bedd8"/>',
           '<text x="106" y="36" fill="#9eb6ce" font-size="16" font-family="Arial">ResearchPi · native interface · offline capture</text>',
           '<g fill="#e1ebf5" font-size="16" font-family="DejaVu Sans Mono,monospace" xml:space="preserve">']
    svg.extend(f'<text x="28" y="{75+i*23}">{html.escape(line)}</text>' for i,line in enumerate(lines))
    svg += ['</g><text x="28" y="735" fill="#9bedd8" font-size="14" font-family="Arial">Actual interface recording. Empty screen rows compacted; disposable path normalized. Offline transport, not model inference.</text></svg>']
    (root/'assets/terminal.svg').write_text('\n'.join(svg)+'\n')
    print('Captured native offline UI and replayable terminal recording.')
