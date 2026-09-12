# Reference material

Drop saved reference pages here and push. This is the way around the sandbox's
egress policy, which blocks `withpersona.com`, `river.ai` and `natural.com` at
the proxy — git is not blocked, so anything committed here is readable.

## How to capture

In your browser, on each page: **Cmd+S** (or Ctrl+S) → save as
**"Webpage, Complete"**. That writes an `.html` file plus a `_files/` folder
containing every stylesheet, script, font and image the page loaded. Put the
whole thing in the matching folder below and push — the CSS is what actually
matters, so don't strip the `_files` folder.

```
reference/
  persona/    withpersona.com — homepage, a product page, the app UI if you
              have access, and design.withpersona.com if it will save
  river/      river.ai — the homepage, and its JS bundle (the GLSL is in there)
  natural/    natural.com — homepage
```

Large binaries (fonts, images) are fine but optional. If you'd rather keep the
repo small, the highest-value files by far are:

1. **river.ai's JS bundle** — the shader source is a string inside it, even
   minified. That is ground truth for the SDF, the aurora filaments, the
   twilight ellipse and the real dot-scale units.
2. **Any `.css` from withpersona.com** — settles typography and the full token
   set, rather than the five brand colours a search could find.
3. **A DevTools "Computed" panel screenshot** for a Persona headline, if saving
   the page is awkward. `font-family`, `font-size`, `font-weight`,
   `letter-spacing`, `line-height` is enough to replace the stand-in.

## What this is for

Extracting the real type scale, colour tokens, radii and spacing, instead of
deriving them from screenshots. Nothing here gets shipped in the app — it is
input to `DESIGN.md`, and any borrowed asset would need its own licence check
before it went into the product.
