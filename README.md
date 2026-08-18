# RealHand ROS 2 SDK Documentation

A responsive, searchable web edition of the RealHand ROS 2 SDK user guide. The site uses a familiar developer-documentation layout with chapter navigation, an on-page table of contents, code-copy buttons, full-text chapter search, and light/dark themes.

Open `index.html` directly for a quick preview, or serve the directory with any static web server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Repository structure

- `index.html` — generated, deployable documentation site
- `assets/` — site styles and interactions
- `realbot-ros2-sdk-documentation.docx` — source document
- `source-export/` — intermediate HTML exported from the source document
- `site-shell.html` — reusable site frame
- `tools/build-site.ps1` — rebuilds `index.html` after a new HTML export

## GitHub Pages

Push this repository to GitHub, then enable **Settings → Pages → Deploy from a branch**, select your default branch, and choose the repository root (`/`). The `.nojekyll` file keeps GitHub Pages from altering the static assets.

The site uses hash-based chapter URLs, so it works correctly from both a user site and a project subdirectory without changing any paths.
