# Source assets

Full-resolution originals. **Not served** — this folder is outside `public/`,
so nothing here is reachable over HTTP or shipped in a deploy.

Keep originals here and export web versions into `public/images/`:

```bash
ffmpeg -y -i assets/hero-basant-lahore-source.png \
  -c:v libwebp -quality 82 -compression_level 6 -preset photo \
  public/images/hero-basant-lahore.webp
```

| File | Used for |
| --- | --- |
| `hero-basant-lahore-source.png` | Homepage hero and the closing CTA band |
