# Next build (20): the floating book

Jörg's notes, 13 Oct 2026. Do not build until he has reviewed it.

## Reader layout
- The book floats in the middle of the screen on a **solid dark grey background**.
- The book is **two perfect squares stacked**: the picture square on top and the words square
  below. Both are the same size, which also makes the page peel land exactly.
- **A slight, subtle drop shadow** under the book.
- **The spine:** a thin, dark grey horizontal line across the middle that neatly separates the
  top and bottom halves. It replaces the soft spine shading.
- The **black bar at the top** still covers the camera area.
- The **black menu bar** stays at the bottom. It no longer shows the book's title, only
  "Page X of Y", in **small bold Helvetica** (not serif).

## Dog-ear
- The same size and position, but its dark triangle now matches the dark grey background, so
  only the white folded triangle really shows.

## Page peel
- Keep it as it is ("very good right now"). The squares should fix the last moment before it
  settles.

## Jörg's mockup (docs/mockups/build20-reader.jpg)
These measurements come from the screenshot at 3x, about 395 points wide.
- **Background:** dark grey #3B3B3B.
- **Top black bar:** covers the status bar and camera (about 60 pt).
- **Book:** about 327 pt wide, with about 33 pt of grey on each side and roughly 22–25 pt above
  and below. The two halves come out as squares (about 328 × 328 pt each).
- **Book shadow:** a soft drop shadow, a little heavier on the bottom and right.
- **Spine:** in the mockup the picture square casts a soft shadow down onto the words square,
  about 20 pt fading out, with no thin line. The written note said a thin line instead, so
  this needs checking with Jörg.
- **Dog-ear:** the dark triangle is the background grey with a soft shadow, and the white
  fold sits in front of it.
- **Bottom black bar:** the burger is at the left. The mockup shows no buttons or label, but
  "Page X of Y" in small bold Helvetica still goes in, as the note above says.

## Sizing notes
- **Even 30 pt grey border (Jörg, 13 Oct):** about 30 points of dark grey on every side of the
  book, top and bottom as well as left and right.
  - Square side = screen width − 60.
  - The book sits 30 pt below the top bar and 30 pt above the bottom bar.
  - The black bars take whatever height is left. The top bar always covers at least the camera
    area, and the bottom bar is never shorter than it needs to be for its buttons.
  - On an iPhone 15 (393 × 852), 30 pt sides would give squares of 333 pt, a book 666 pt tall,
    and 126 pt left for the two bars. But the bars need about 59 pt at the top (camera) and
    about 34 pt of home-indicator area plus a slim bar of about 45 pt at the bottom, which is
    about 138 pt. So the squares come out at about 327 pt, about 33 pt from the sides.
    Taller iPhones get the full 30 pt.
  - On a short screen where the bars wouldn't fit, the squares shrink instead, keeping the
    30 pt grey border.
- Text size: words are fitted inside the words square, so long pages may use a slightly
  smaller size than now.
