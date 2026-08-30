#!/bin/sh
# Build step for Cloudflare Pages.
#
# Cloudflare Pages rejects any asset over 25 MiB and fails the whole
# deployment when it finds one. The two Songkran masters are 92-95 MB, so
# they stay on GitHub Pages (which allows up to 100 MiB and serves byte
# ranges) and index.html points at them there by absolute URL.
#
# Cloudflare Pages settings this expects:
#   Build command:           sh build.sh
#   Build output directory:  dist
set -eu

rm -rf dist
mkdir dist

# Ship exactly what is committed - never the untracked source masters.
git archive HEAD | tar -x -C dist

# Anything still too large for Pages is served from GitHub Pages instead.
find dist -type f -size +24M -print -delete

echo "dist/ ready:"
du -sh dist
