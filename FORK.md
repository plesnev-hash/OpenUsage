# Fork

This repository is a public fork of [paulocarinhena/OpenUsage](https://github.com/paulocarinhena/OpenUsage) **1.0.1**, commit `1aac35a` (12 October 2026). The original work is under the Apache License 2.0; this copy keeps that license. Modified files say so at the top.

A fresh install shows **spent** percent: the bar starts nearly empty and fills as the limit is used. "Left" remains available in Settings.

## What changed

Linux window (`widget-linux/openusage.py`):

- On a Wayland session with XWayland, the widget forces the X11 backend even when the parent process already set `GDK_BACKEND=wayland`. That is what lets GNOME keep the window above others and accept its position.
- Starting `openusage.py` directly loads the Cairo bridge. Without it, drawing a provider logo aborted the window and left an empty 200×200 frame with no drag header. If `python3-gi-cairo` is missing, the script uses a vendored bridge under `.runtime` when that directory is present. `.runtime` is a local install artifact and is not part of this repository.
- The shine layer no longer takes pointer clicks. Header buttons sit outside the drag surface. Dragging the "OpenUsage" title moves the window itself; asking the window manager to start a move did not move this undecorated XWayland window and swallowed the click.

Cursor (`src/providers/cursor.ts`):

- `autoPercentUsed` is the Cursor-model pool (Grok, Composer), labeled **Limits**.
- `apiPercentUsed` is the other-model pool, labeled **Other models**.
- The plan's cent totals and `breakdown.bonus` are not drawn. They are a different ledger and were showing a full dollar bar and a bonus line for an unused other-model pool.

Claude (`src/providers/claude.ts`):

- The CLI path is unchanged: `~/.claude/.credentials.json`, then the live usage API.
- Claude Desktop on Linux does not write that file. When it is missing, the widget reads the latest `fh` and `sd` samples from `~/.config/Claude/plan-usage-history.json` (5-hour and 7-day).

OpenCode Go was already read from `GET https://opencode.ai/zen/go/v1/usage` with the `opencode-go` key in `~/.local/share/opencode/auth.json`. No provider code change. The widget only needed a refresh after the key appeared.

Compact and strip rows draw every pool, not only the first hour/week pair, so Cursor's second bar and OpenCode Go's monthly bar stay visible.

## What was checked

On this Ubuntu GNOME Wayland session, through XWayland, on 17 October 2026:

- After the Cairo fix the window had its real content and the Above/Sticky state, instead of an empty 200×200 frame.
- A synthetic pointer press on the title moved the window. A synthetic press on the settings button opened the settings window. A physical mouse click was not part of that check.
- Cursor showed Limits from `autoPercentUsed` and Other models from `apiPercentUsed`, with no bonus line and no included-dollar line. The bars matched the spent percent.
- With Claude Desktop running and no CLI credentials file, the panel showed the Desktop history meters instead of "not signed in". The Desktop OAuth token was not read, and the live Anthropic usage API was not called for that path.
- After an OpenCode Go key was stored, a usage request returned the 5-hour, weekly and monthly windows, and the panel showed those three rows.

Not checked: macOS, Windows, a physical drag with the user's mouse, and a fresh clone on a machine that has neither `python3-gi-cairo` nor a local `.runtime` bridge.

## Русский

Это публичный форк [paulocarinhena/OpenUsage](https://github.com/paulocarinhena/OpenUsage) версии 1.0.1, коммит `1aac35a`. Лицензия исходного проекта — Apache 2.0, она сохранена.

Свежая установка показывает уже израсходованную долю: полоска почти пустая и растёт по мере траты. Режим «осталось» по-прежнему есть в настройках.

Доработано:

- Окно Linux держится поверх других и перетаскивается за заголовок OpenUsage. Кнопки нажимаются: прозрачная подсветка больше не забирает щелчок, а сдвиг окна не отдаётся оконному менеджеру, который на этой сессии его не двигал.
- Прямой запуск не обрывается на логотипе, если системный мост Cairo не установлен, но рядом есть каталог `.runtime`.
- У Cursor две шкалы: Limits — модели Cursor, включая Grok; Other models — другие модели. Строки бонуса и включённых долларов убраны.
- Если открыт Claude Desktop и нет файла входа терминального Claude Code, виджет берёт 5-часовую и 7-дневную шкалы из истории Desktop.
- OpenCode Go код не менял: после появления ключа виджет показывает 5 часов, неделю и месяц.

Проверено 17 октября 2026 на Ubuntu GNOME с Wayland через XWayland: содержимое окна, состояние «поверх всех», искусственный сдвиг за заголовок, открытие настроек искусственным щелчком, шкалы Cursor, Claude Desktop и OpenCode Go. Обычная мышь, macOS и Windows не проверялись.
