# Next.js template

This is a Next.js template with shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```

## Third-party assets

APRS symbol graphics are vendored from
[`hessu/aprs-symbols`](https://github.com/hessu/aprs-symbols) at a pinned
revision. The complete attribution, provenance notes, and checksums are in
[`public/aprs-symbols/NOTICE.md`](public/aprs-symbols/NOTICE.md).
