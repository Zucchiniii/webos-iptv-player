<div align="center">
  <img src="assets/icon-rounded.svg" width="128" height="128" alt="webOS IPTV Player icon">
  <h1>webOS IPTV Player</h1>
  <p><strong>A fast, modern IPTV player for LG webOS TVs.</strong><br>
  M3U playlists, Xtream Codes accounts, an XMLTV guide, catch-up and timeshift, rebuilt for huge playlists and the 10-foot screen.</p>
  <p>
  <a href="#supported-webos-versions"><img src="https://img.shields.io/badge/webOS-4%2B-e6007e?logo=webos&logoColor=white" alt="webOS 4+"></a>
  <a href="https://github.com/Zucchiniii/webos-iptv-player/releases/latest"><img src="https://img.shields.io/github/v/release/Zucchiniii/webos-iptv-player" alt="Latest release"></a>
  <a href="#install"><img src="https://img.shields.io/badge/Homebrew%20Channel-ready-4f7dff" alt="Homebrew Channel ready"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="Apache-2.0"></a>
  </p>
  <p>Maintained by <a href="https://github.com/Zucchiniii">@Zucchiniii</a> · based on
  <a href="https://github.com/lennylxx/webos-iptv-player">webOS IPTV Player by lennylxx</a></p>
</div>

<p align="center">
  <img src="docs/screenshots/live-grid.png" alt="Live TV: country chips, the focused channel's now and next, and the channel grid">
</p>

## Install

1. Install [webOS Homebrew Channel](https://github.com/webosbrew/webos-homebrew-channel) on the
   TV (rooted TVs and Developer Mode both work).
2. In Homebrew Channel open **Settings → Add repository** and enter:

   ```text
   https://raw.githubusercontent.com/Zucchiniii/webos-iptv-player/main/homebrew-repository.json
   ```

3. Find **webOS IPTV Player** in the app list and choose **Install**. New releases show up there
   as updates.

Coming from the original app? This fork keeps the same app ID, so it installs over it and keeps
your playlists, favorites, and settings. Prefer the command line? See
[Developer Mode](#developer-mode) below.

## What's new in 2.2

- **Read every channel in full.** While you watch, a card beside the channel list shows the
  focused channel's full name, what's on with its time and progress, the program description,
  and what's next. Rows no longer slide their text back and forth. In Live, card names and the
  header's name and title wrap onto two lines instead of being cut off.
- **Refreshed app icon**: the original's gradient ring and play button, simplified, and the same
  everywhere (TV home screen, Homebrew Channel, in-app logo); plus a Homebrew Channel page that
  describes the app and links here.
- **Fixed:** a thin strip of the hidden group panel showed at the screen's left edge while
  watching.

<table>
  <tr>
    <td><img src="docs/screenshots/player-channels.png" alt="While watching: the channel list with the focused channel's details card"></td>
    <td><img src="docs/screenshots/movie-detail.png" alt="Movie details with backdrop, cast, and resume"></td>
  </tr>
  <tr>
    <td align="center">The channel list while watching, with the details card</td>
    <td align="center">Movie details</td>
  </tr>
</table>

## Why this fork

The original app is excellent under the hood, but large provider lists crashed it on newer TVs,
and finding a channel meant scrolling long lists. This fork keeps its playback engine and adds:

**Stable with huge playlists (2.0)**

- Movies and series that M3U lists mix into Live are filtered out before they reach memory. On a
  300,000-entry list, peak memory dropped about 2.7×.
- Pasted `get.php` links become Xtream accounts automatically, so movies and series land in
  their own sections.
- Live is capped at 150,000 channels, and a crash while loading reopens the app in a safe mode
  instead of crash-looping.

**Find channels fast (2.0)**

- A card grid with a header that shows what's on now and next for the focused channel.
- Country chips turn a worldwide list into your own country's groups. The TV's location setting
  picks the first country, and Live reopens where you left it.

**Sharper and smoother (2.1)**

- On a 4K TV, channels play up to 2160p and start at full quality. The TV's player otherwise caps
  streams at 1080p and starts low (Settings → Playback → Stream quality).
- Artwork is fetched at the size it's drawn; movie and series heroes switch to the widescreen
  backdrop.
- Focus moves animate on the compositor only, and the player panels skip a blur the TV's video
  plane can't show.
- Search shows channel results at once and fills in movies and series as the catalog arrives; the
  catalog is warmed in the background after startup.
- A channel that loses its stream stays on screen and retries, instead of switching to the next
  channel. Press OK to retry at once.

**A 2026 look**

- True-black Noir theme, the Inter typeface, a floating glass navigation pill with a clock,
  cinematic Movies and Series heroes, and glass player overlays.

## Screenshots

| Live TV with playlist groups | Live preview |
| --- | --- |
| ![Live TV with playlist groups](docs/screenshots/channel-list.png) | ![Live preview](docs/screenshots/live-preview.png) |

| Program guide | Catch-up resume |
| --- | --- |
| ![Program guide](docs/screenshots/epg-guide.png) | ![Catch-up resume](docs/screenshots/epg-catchup-resume.png) |

| Channel info | Playback overlays |
| --- | --- |
| ![Channel info](docs/screenshots/channel-info.png) | ![Playback overlays](docs/screenshots/player.png) |

| Movies | Series detail |
| --- | --- |
| ![Movies](docs/screenshots/movies.png) | ![Series detail](docs/screenshots/series-detail.png) |

| Search | Recently watched |
| --- | --- |
| ![Search](docs/screenshots/search.png) | ![Recently watched](docs/screenshots/recently-watched.png) |

| Subtitles | Subtitle search |
| --- | --- |
| ![Subtitles](docs/screenshots/subtitles.png) | ![Subtitle search](docs/screenshots/subtitle-search.png) |

| Settings | Themes |
| --- | --- |
| ![Settings](docs/screenshots/settings.png) | ![Themes](docs/screenshots/themes.png) |

| Reminder manager | Parental controls |
| --- | --- |
| ![Reminder manager](docs/screenshots/reminder-manager.png) | ![Parental controls](docs/screenshots/parental-controls.png) |

| Phone setup page | |
| --- | --- |
| ![Phone setup page](docs/screenshots/setup-page.png) | |

Screenshots come from the real app with fictional demo data: `npm run screenshots` regenerates
all of them.

## Features

**Playlists & accounts**

- **M3U playlists** — load multiple M3U/M3U8 lists, auto-deduplicated, and temporarily disable a source without deleting its setup
- **Xtream Codes accounts** — add or temporarily disable accounts, or switch between accounts from the top-bar avatar; playlists and EPG data are derived from their credentials
- **LAN setup** — configure sources and online subtitle settings or upload `.m3u` files from a phone on the same network by scanning a QR code ([LAN service](docs/lan-service.md))

**Live TV & on-demand**

- **Channel grid** — four cards to a row with logos and live progress, a header with the focused channel's now and next, and country chips for provider lists that prefix groups with a country (a list layout is available in Settings)

- **Program guide (EPG)** — three-pane guide with an auto-derived date range, per-source time correction, and caching for instant reopen
- **Channel health** — check live streams and mark them as healthy, suspect, or unavailable
- **Reminders** — flag an upcoming program and get notified at air time, even with the app closed, to tune straight in
- **Recently Watched** — return to recent live channels or resume partially watched catch-up programs
- **Live preview** — keep live playback beside the channel list while browsing, with program info and quick controls
- **Movies & Series** — browse an Xtream account's VOD catalogs, with Continue Watching and account-scoped Watchlist rails
- **Catalog sorting** — sort Movies and Series by name, date added, rating, or year in either direction; each section remembers its choice
- **Continue Watching & Watchlist management** — remove individual titles, clear a whole list, or clear a movie's saved progress from its details page
- **Automatic VOD queues** — continue through series episodes or remaining Watchlist movies, removing completed titles from the Watchlist
- **Catch-up & Live DVR** — replay past programs, and pause / rewind / return to the live edge on live streams
- **Parental controls** — lock Live TV groups, movie and series categories, or individual titles with a PIN, with adult groups suggested for locking; locked content can stay listed with a lock or be hidden, and you choose when the PIN is asked again

**Playback**

- **Native HDR & Dolby passthrough** — the stream goes straight to the TV's decoder, so HDR10, HLG, Dolby Vision®, and Dolby Atmos® pass through untouched — **[Why native instead of hls.js? See the on-device comparison](docs/native-vs-hls.js.md)**
- **MPEG-DASH playback** — play clear and PlayReady `.mpd` channels through the native webOS pipeline, or Widevine/ClearKey through an on-demand Shaka MSE/EME path, with MPD track metadata, live DVR, and subtitle support ([details](docs/mpeg-dash.md))
- **Native PlayReady DRM** — play protected MPEG-DASH channels on compatible webOS TVs through LG's DRM service and native hardware media pipeline, with license settings supplied by Kodi-style M3U properties ([details](docs/mpeg-dash.md))
- **Widevine / ClearKey DRM** — load Shaka DASH-only on demand, with Kodi-style license URLs and request headers or validated inline ClearKey keys ([details](docs/mpeg-dash.md))
- **Channel HTTP headers** — channels whose M3U sets a Referer, User-Agent, Cookie, or Authorization play through the TV's media service, or optionally a local proxy, with those headers ([details](docs/http-header-playback.md))
- **Audio & subtitle tracks** — pick from the player menu, remembered per channel or VOD item; subtitles cover in-manifest WebVTT and CEA-608/708 (live), in-container / sidecar SRT/WebVTT/ASS (VOD), and online search (SubDL, OpenSubtitles, and Assrt) with a manual title box; online search remains available when bundled tracks exist, and subtitle timing can be adjusted live
- **Playback speed** — choose 0.5×–2× for movies and episodes in file formats such as MP4 and MKV; live TV, catch-up, and HLS/DASH streams play at normal speed because the webOS native pipeline ignores rate changes for them
- **On-screen display** — program title, progress, and a live stream-info readout (resolution, HDR, frame rate, codec, audio channels)
- **Automatic playback recovery** — detect streams that fail to start or stall and reload them; a live channel that stays down is held on screen and retried with a growing pause (OK retries at once) instead of switching channels
- **Resync A/V** (🔄) — one tap on the playback bar re-locks audio and video that drift apart during a long catch-up or on-demand stream

**Navigation**

- **Search** — across channels, EPG programs, movies, and series, with direct live, catch-up, and reminder actions; recent searches drop down under the search box for one-press repeat searches; the search index is prebuilt in the background and cached, so Search is ready almost instantly
- **Channel sidebar** — switch channels over the video, organized by group; a card beside the list spells out the focused channel's name, current program, description, and what's next
- **Channel customization** — reorder, hide, rename, regroup, manage favorites, and correct per-channel EPG matching or timing
- **Auto-play and genre group icons** for faster browsing
- **Number-key channel entry** — press the remote's number keys to tune by channel number from the channel list or while watching, with on-screen digit feedback
- **Full remote & Magic Remote** — spatial D-pad navigation and pointer control across every view
- **Magic Remote edge scrolling** — rest the pointer near the edge of a catalog or search rail, tab row, or Guide date strip to scroll it, faster the longer it stays
- **Color themes** — choose from light and dark app-wide themes with live previews, plus Dark or Frosted player overlays; selections persist across launches
- **Adjustable text size** — scale text from 80%–150% without resizing controls
- **Animation mode** — Essential turns off costly motion on older TVs, Reduced keeps visual effects but scrolls instantly, and Full smooth-scrolls single navigation steps
- **Multilingual interface** — available in English, Deutsch, Español, Français, Italiano, Polski, Português (Brasil), Русский, Türkçe, Українська, and 简体中文; follows the TV language by default or can be selected explicitly in Settings

**Development**

- **Desktop preview** — browser-based playback via HLS.js, mpegts.js, and Shaka

## Unsupported features and limitations

Some features are unavailable because of webOS platform limits or design
choices. See the [full list](docs/unsupported-features.md).

## Supported webOS versions

The app runs on **webOS 4.0 (2018) and newer**. Its baseline is the Chromium 53
engine on webOS 4; every later release ships a newer Chromium, so the app is
forward-compatible. Features only newer engines support natively (flex `gap`,
`backdrop-filter`, …) get feature-detected fallbacks on the older ones.

| webOS version | Released | Chromium engine | Bundled service Node.js | Supported |
| --- | --- | --- | --- | --- |
| webOS 4.x | 2018–2019 | 53 | 0.12.2 | ✅ (minimum) |
| webOS 5.0 | 2020 | 68 | 8.12.0 | ✅ |
| webOS 6.0 | 2021 | 79 | 8.12.0 | ✅ |
| webOS 22 | 2022 | 87 | 12.21.0 | ✅ |
| webOS 23 | 2023 | 94 | 12.22.2 | ✅ |
| webOS 24 | 2024 | 108 | 16.19.1 | ✅ |
| webOS 25 | 2025 | 120 | 16.20.2 | ✅ |
| webOS 26 | 2026 | 132 | 20.12.2 | ✅ |

webOS 3.x and older (Chromium 38 and earlier) are not supported.

## Prerequisites

Command-line installation and local builds require
[Node.js](https://nodejs.org/) (v22+) and the
[webOS CLI tools](https://webostv.developer.lge.com/develop/tools/cli-installation):

```bash
npm install -g @webos-tools/cli
```

Adding the repository directly in Homebrew Channel does not require these tools.

## Install on your TV

### Homebrew Channel

Install the community
[webOS Homebrew Channel](https://github.com/webosbrew/webos-homebrew-channel),
then open **Settings → Add repository** and enter:

```text
https://raw.githubusercontent.com/Zucchiniii/webos-iptv-player/main/homebrew-repository.json
```

To prefill the repository URL from a computer configured with `ares-cli`, run:

```bash
ares-launch --device tv org.webosbrew.hbchannel -p '{"launchMode":"addRepository","url":"https://raw.githubusercontent.com/Zucchiniii/webos-iptv-player/main/homebrew-repository.json"}'
```

Confirm **Add repository** on the TV. Homebrew Channel can then install the app
and detect updates from later GitHub releases.

### Developer Mode

1. **Download the app.** On your computer, open the
   [Releases page](https://github.com/Zucchiniii/webos-iptv-player/releases/latest)
   and download the latest `.ipk` file.

2. **Turn on Developer Mode on the TV.**
   - Create a free account at the [LG webOS Developer site](https://webostv.developer.lge.com/).
   - On the TV, open the **LG Content Store**, search for **Developer Mode**, then
     install and open it.
   - Sign in with your LG developer account and switch **Dev Mode Status** to **ON**.
     The TV restarts. Note the **IP address** and **passphrase** the app shows.

3. **Register your TV.** Add it as a device named `tv` (replace the IP with your TV's):

   ```bash
   ares-setup-device --add tv -i "username=prisoner" -i "host=127.0.0.1" -i "port=9922"
   ```

   Then fetch the device key, entering the **passphrase** from the Developer Mode app when prompted:

   ```bash
   ares-novacom --device tv --getkey
   ```

4. **Install the app.**

   ```bash
   ares-install --device tv ./com.lennylxx.iptv_<version>_all.ipk
   ```

## Development

### Setup

```bash
npm install
```

### Build

```bash
./build.sh
```

### Build & Install to TV

```bash
./build.sh --install [device-name]
```

If no device name is given, the default device from `ares-setup-device` is used.

### Debug on a TV

On Windows, use WSL 2; native Windows is not supported.

`scripts/tv.sh` reads the connection details for the default
`ares-setup-device` device, so keys and passphrases do not need to be copied
into commands.

```bash
scripts/tv.sh logs --app com.lennylxx.iptv       # Stream the app's DevTools console
scripts/tv.sh eval 'document.visibilityState'    # Evaluate JavaScript in the app page
scripts/tv.sh perf --duration 30                 # Sample CPU, heap, DOM, and layout
scripts/tv.sh diag                               # Capture a redacted diagnostics report
scripts/tv.sh capt screenshot screen.png         # Capture video and app OSD
scripts/tv.sh capt record screen.mp4             # Record 10 seconds, target 5 fps, no audio
scripts/tv.sh input key down ok red              # Press remote keys
scripts/tv.sh input click 700 450                # Move the Magic Remote pointer and click
scripts/tv.sh input wheel 3                      # Scroll the wheel 3 notches down at the pointer
scripts/tv.sh input key power                    # Turn the TV off
scripts/tv.sh input wake                         # Turn the TV on (Wake-on-LAN)
scripts/tv.sh run 'uname -a'                     # Run a TV command over SSH
scripts/tv.sh push ./file.txt /tmp/file.txt      # Copy a local file to the TV
scripts/tv.sh pull /tmp/file.txt ./file.txt      # Copy a TV file to this computer
scripts/tv.sh shell                              # Open an interactive SSH session
scripts/tv.sh reboot                             # Reboot the TV through Luna
TV_DEVICE=tv2 scripts/tv.sh logs                 # Select a non-default configured TV
```

Run `scripts/tv.sh logs --help` (or `eval`, `perf`, `diag`, `capt`,
`input`) for options.

### Preview in Browser

```bash
npm run preview
```

Opens at http://localhost:3000. Video playback uses HLS.js, mpegts.js, and Shaka on desktop.

## Settings

Open with the **Blue** key or the **Settings** tab in the top bar. Sections:

- **Language** — follow the TV's system language when supported, or choose a language explicitly.
- **Device Setup** — scan the QR code to configure the app from a phone, or open the shown URL on a computer and enter the pairing code.
- **Parental controls** — set a PIN; lock Live TV groups, movie and series categories, or individual titles; show locked content with a lock or hide it; and choose when the PIN is asked again.
- **Xtream Accounts** — add, edit, remove, or temporarily disable accounts; check credentials, connection usage, and expiry; choose TS, HLS, or Auto for live streams; and pick the **Live categories** to load, optionally showing new ones automatically. The playlist and EPG are derived from the account credentials on Save.
- **Playlists** — add, edit, remove, or temporarily disable M3U URLs. Re-applied on Save.
- **Upload Playlists** — lists playlists uploaded through Device Setup, with controls to temporarily disable or remove each upload. New uploads appear automatically through Luna push.
- **Channels** — check live-stream health; keep movies and series that M3U lists mix in out of Live; reorder, hide, rename, regroup, manually map entries to XMLTV channels, or correct one channel's EPG time; show hidden channels or reset customizations.
- **Manual XMLTV sources** — add several program guide URLs, prioritized from top to bottom, and apply each to all playlists or to specific ones. Guide URLs are also discovered automatically from `url-tvg`, `x-tvg-url`, or `tvg-url` in M3U playlists.
- **EPG time zone** — show guide times in the TV's **Device** time zone or the guide **Feed** time zone.
- **EPG time correction** — adjust each source independently in 15-minute steps.
- **Program reminders** — open the date-grouped Reminder Manager to review or remove upcoming reminders.
- **Appearance** — preview an app-wide color theme, choose Dark or Frosted player overlays, pick the grid or list channel layout, and adjust text from 80% to 150%.
- **Playback** — toggle auto-play and Live preview, choose Maximum or Standard
  stream quality, and choose whether Channel Up/Down cycles the global list or
  stays within the active group, Favorites, or playlist.
- **Online Subtitles** — choose a preferred subtitle language and configure SubDL, OpenSubtitles, and Assrt credentials for online search.
- **Advanced** — customize advanced interface, playback, and background refresh behavior.
- **Data Management** — refresh data, clear caches or viewing lists, or reset the app.
- **Save Changes** applies preferences and reloads playlist and guide data when their sources change. **Cancel** discards edits.

## Remote Control Mapping

| Key | Player | Channel List | EPG |
|-----|--------|-------------|-----|
| Up/Down | Channel +/- | Navigate | Navigate within pane |
| Left | Open sidebar, then groups; seek −30s when available | Move toward groups | Previous pane or day |
| Right | Open menu; seek +30s while the OSD shows on seekable playback (press OK to show it) | Move toward channels | Next pane, day, or Reminder Manager |
| OK/Enter | Toggle OSD; pause/resume; activate overlay | Select channel | Play channel/program or open Reminder Manager |
| Back | Back out of sidebar/menu, then hide a paused OSD; stop & return | Exit app (press twice) | Close guide |
| Red | Open EPG | Open EPG | — |
| Blue | Open settings | Open settings | Open settings |
| Yellow | Show OSD | Edit channel list | Search guide |
| Green | Toggle favorite (in sidebar/menu) | Toggle favorite (on focused channel) | Jump to today |
| Play/Pause | Pause/resume playback | — | — |
| Rewind/Fast-Forward | To oldest / Go to live (live DVR) | — | — |
| Ch +/- | Channel +/- | Previous/next channel | Jump 10 channels/programs |
| 0-9 | Direct channel entry | Direct channel entry | — |

Movies, Series, Search, Settings, and Reminder Manager use standard D-pad
navigation; **Back** returns to the previous view.

## Docs

Implementation deep-dives for contributors — the webOS-specific behavior behind
some of the features above:

- [`docs/native-vs-hls.js.md`](docs/native-vs-hls.js.md) — why on-device playback uses the native `<video>` pipeline (HDR & Dolby passthrough) instead of hls.js
- [`docs/audio-track-selection.md`](docs/audio-track-selection.md) — how audio-track switching works on the native webOS player
- [`docs/hls-subtitles.md`](docs/hls-subtitles.md) — how live HLS subtitles are handled on webOS (in-manifest types and their render paths)
- [`docs/mpeg-dash.md`](docs/mpeg-dash.md) — how DASH detection, native playback, subtitles, and live DVR work
- [`docs/http-header-playback.md`](docs/http-header-playback.md) — how channels that need a Referer, User-Agent, Cookie, or Authorization play through the TV's media service or the local proxy
- [`docs/vod-subtitles.md`](docs/vod-subtitles.md) — how VOD (Xtream movies & episodes) subtitles work: in-container tracks plus sidecar SRT/WebVTT/ASS, and online subtitle search (SubDL, OpenSubtitles, Assrt)
- [`docs/storage-and-data.md`](docs/storage-and-data.md) — what the app stores, where it lives, and how user data is separated from disposable caches
- [`docs/lan-service.md`](docs/lan-service.md) — phone setup and M3U uploads over the bundled LAN service
- [`docs/unsupported-features.md`](docs/unsupported-features.md) — features that webOS does not allow or that are intentionally out of scope, with alternatives

## License and third-party notices

This project is a fork of
[lennylxx/webos-iptv-player](https://github.com/lennylxx/webos-iptv-player),
whose authors wrote the playback engine and most features listed above; the
changes in this fork are described in [Why this fork](#why-this-fork). It is
licensed under [Apache-2.0](LICENSE). Third-party software and
artwork retain their own licenses; see [the attribution inventory](THIRD_PARTY_NOTICES.txt).
Every build includes `LICENSE`, `THIRD_PARTY_NOTICES.txt`, and a `licenses/`
directory in `dist/`, so the notices accompany the packaged app. This inventory
covers the production IPK, not the additional playback libraries used only for
local desktop preview.
