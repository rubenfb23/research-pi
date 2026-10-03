# Clipboard

In the native interface, `/copy` copies the latest assistant answer and Ctrl+X copies the active selection or latest answer according to Pi settings. In fullscreen mode, dragging to select text copies it automatically when `fullscreenCopyOnSelect` is enabled. `/copy` also works in the simple interface (`repi --plain`). Copying a full answer retains its original Markdown/LaTeX source.

Ctrl+C is also used to cancel generation. Use `/copy` or Ctrl+X for an unambiguous ResearchPi copy action. Terminal-managed copy/paste shortcuts depend on your terminal application.

## Linux desktop prerequisites

Pi uses `wl-copy` on Wayland and `xclip` or `xsel` on X11. Version 1.4.1's `.deb` declares `wl-clipboard` and `xclip` as dependencies; install it with `apt` so dependencies are resolved. Chat remains usable on headless machines. SSH/container clipboard access depends on the terminal's OSC 52 support and policy; a sent escape sequence does not establish successful clipboard delivery.

For a source/npm installation on Ubuntu or Debian, run:

```sh
repi setup --clipboard
repi clipboard
repi
```

Setup downloads `wl-clipboard` and `xclip` through your configured apt repositories, extracts them under `<ResearchPi data>/clipboard/`, and retains their package documentation and copyright files. It requires no sudo, adds no npm dependency and changes PATH only inside ResearchPi. It checks that the tools can start; it does not read or overwrite your clipboard. Downloaded helpers still require their system libraries. If apt is unavailable or the libraries are missing, install the two packages using your distribution's package manager.

An administrator-managed installation is also supported:

```sh
sudo apt install wl-clipboard xclip
```

Restart an already-running ResearchPi session after setup. Credentials, conversations and scientific evidence are unchanged. User-installed helpers remain when the application is uninstalled.

## Verification and limitations

`repi clipboard` reports prerequisites and always returns `verified: false`: checking executables cannot certify clipboard access. To verify copying, use `/copy` after a response and paste into another application. Missing display access, container restrictions or terminal clipboard policy can still prevent copying.

Automated Linux tests drive the real native interface's `/copy`, Ctrl+X and mouse selection through a pseudo-terminal into a controlled desktop-command fixture. Separate checks preserve exact Unicode/multiline bytes through Pi's actual clipboard command and exercise simple-mode `/copy`. Installed Linux smoke checks require both desktop backends. A real local Wayland copy/readback check additionally passed with Unicode and multiline text; the previous text clipboard was restored without logging its contents. Clipboard interaction on a real Windows/macOS desktop is not covered by these new regression tests.
