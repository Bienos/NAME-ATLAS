# Site-link card source

`name-atlas-v4.html` is the source of `public/share/name-atlas-v4.jpg`, the 1200 × 630 card
shown when the bare site link is shared. It is a static page: the dotted map of Poland is
decorative and shows no register data.

To re-export, open the page at a 1200 × 630 viewport with device scale 1 (for example with
Playwright), wait for `document.fonts.ready`, and save a JPEG screenshot at quality 90. The
export must carry no EXIF or Photoshop blocks (Meta rejected `v2` for that). Give a changed
card a new file name (`v5`, …) so link caches fetch it.
