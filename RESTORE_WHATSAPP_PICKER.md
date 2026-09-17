# Restore WhatsApp-style comment picker

This marker documents the V14.10 rollback from the newer V2 comment picker to the original WhatsApp-style Emoji / Stiker / GIF / Recent picker implemented by `public/engagement-motion.js`.

The V14.10 worker deliberately bypasses V14.8 picker injection while retaining V14.7 comment display fixes. The PWA cache is also bumped so mobile clients refresh stale injected markup/scripts.
