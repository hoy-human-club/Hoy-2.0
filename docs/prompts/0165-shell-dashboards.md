# Shell and dashboards

The left nav should be alsways there. And remove the scroll bar ffrom it. and the Dashboard content is not balanced yet. Somewhere its still blank. Please fix these in all the user role and make it balanced looking. Can we reomove the heading and subhead like Front desk today
You are viewing the Front desk home. to all the pages to shave the precious space from here.

I don't like the scroll bar in any state please make another UX friendly way

The 3d look and feel is not there in the dashboard at all

## Response

On `ui-polish/shell-dashboards`:
- **Menu:** it stays on screen at every size except phones (an icon rail from 600 to 1023 px) and never shows a scrollbar; a fade and a chevron appear only where more items are hidden.
- **Page titles:** in-page titles and subtitles are visually hidden, since the top bar names the page.
- **Role homes:** the staff, admin and teacher homes are paired, equal-height rows.
- **Depth:** tiles and cards have a resting depth, and the hover tilt is stronger.

See changelog 0165.
