# Web app ground rules

These rules apply to everything under `src/apps/web`. The folder layout is adapted from [bulletproof-react](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md), with the differences below.

## Folder organization

Code lives at the **nearest common parent** of everything that uses it. Location tells you scope: a module is used at its own level and below, never globally by default. Each level can have its own `features/` and `design/` folders.

The route tree is the usage tree, so `features/` and `design/` are colocated with routes in `src/routes/`. The router plugin is configured with `routeFileIgnorePattern: '^(features|design)$'` (in `vite.config.ts`), so those folders and everything inside them never become routes.

```text
src/
├── routes/
│   ├── __root.tsx
│   ├── design/                 # app-wide (__root is the top-level user): theme, layout primitives, Mantine wrappers
│   ├── features/               # features used by more than one top-level route, or by __root
│   ├── index.tsx
│   └── batches/
│       ├── design/             # shared only by batch routes
│       ├── index.tsx
│       └── $batchId/
│           ├── index.tsx
│           └── features/
│               └── batch-timeline/
│                   └── design/ # used only inside batch-timeline
├── clients/                    # server-only clients for upstream services (see Upstream clients)
│   └── store/
└── router.tsx
```

- **Never create a catch-all `components/` folder.**
- **`features/`** holds self-contained feature modules (UI, hooks, state, server functions, schemas), scoped to the nearest parent that uses them. A feature can nest sub-features in its own `features/` folder.
- **`design/`** holds layout primitives, Mantine customizations (theme, component defaults), and reusable presentational components. Use Mantine directly whenever possible. Only wrap a component or build your own when Mantine doesn't cover the need, and when you do, put it in a `design/` folder.
- **Being a design component doesn't make it global.** Put it in the `design/` folder at the closest common parent of where it's actually used. Only `src/routes/design/` is app-wide.
- **Hoist on demand, not in advance.** When code gains a user outside its subtree, move it up to the nearest common parent's `design/` or `features/` folder. Don't pre-hoist "in case it's reused".
- **Import direction:** import from your own subtree, or from the `design/` and `features/` folders of an ancestor level. Never reach into a sibling's or cousin's subtree (`../other-feature/...`). If you need something from there, hoist it. Parents compose child features; sibling features don't import each other.
- **At route levels, every file is a route unless it is inside `features/` or `design/`.** Don't put loose helpers or other folders (e.g. `formatters/`) directly in a route directory. Put them inside the feature or design module that uses them. For a rare exception, the `-` prefix (`-something/`) also hides a file or folder from the router.
- **Route files compose; features implement.** A route file defines the route (loader, search params, page layout) and composes features. Feature logic lives in `features/`.
- **No barrel `index.ts` files.** Import modules directly; barrels hurt Vite tree shaking. In route directories, `index.tsx` is a route file, not a barrel.

## Naming

- **Never create `lib/`, `utils/`, `helpers/` folders or generic `types.ts` files.** Use descriptive names scoped to where they're used: `formatters/gravity.ts`, not `utils/format.ts`.
- **If something is only used in one place, inline it** in the file that uses it.
- Types live with the code that owns them, and are usually inferred from a Zod schema (`z.infer`) or from the implementation.
- Components are `PascalCase.tsx`. RPC functions in `src/clients/` are named after their function (`getLatestMeasurements.ts`). Other modules are `kebab-case.ts`.
- BFF file suffixes:
  - `*.functions.ts`: `createServerFn` wrappers.
  - `*.schemas.ts`: browser-facing Zod schemas. Must stay client-safe.
  - `*.server.ts`: server-only code outside `src/clients/`. Must start with `import '@tanstack/react-start/server-only'`.

## TypeScript and React

- **Let TypeScript infer return types. Never annotate them**, including on components, hooks, helpers, and server function handlers.
- **Components take `(props: Props)` and destructure inside the body**, never in the parameter list:

  ```tsx
  type Props = {
    reading: Reading
  }

  export function ReadingCard(props: Props) {
    const { reading } = props
    // ...
  }
  ```

  A secondary component in the same file uses `<Name>Props` (e.g. `ReadingCardProps`) to avoid a clash.

## Upstream clients

Every call the web server makes to an upstream service goes through `src/clients/<service>/`, where the folder is named after the service (`store`, …). Everything in `src/clients/` is server-only, and every file starts with `import '@tanstack/react-start/server-only'`. Server functions call RPC functions. Nothing else talks to upstream services.

- **`client.ts`** creates the service's client lazily when one is needed (base URL, credentials from `process.env`, transport, timeouts, error mapping). Only the RPC functions in the same folder import it.
- **One RPC function per file**, named after the function: `clients/store/getLatestMeasurements.ts`. Each file exports three things:
  - **`I<Name>Request`**: an `interface`, like a protobuf/gRPC request message. Fields are optional unless the call can't work without them. Empty is fine.
  - **`<Name>Response`**: a `type`, never an `interface`. It's standalone: never extend or intersect other request or response types (no `extends`, no `&`). It may reference upstream entity types such as `StoreMeasurement`.
  - **`export async function <name>(request: I<Name>Request)`**.
- **Typing the response without a return annotation:** the response is validated against the upstream's published contract (e.g. `@bbferm/store-contract`). Annotate the local result variable with `<Name>Response` and return it, so the inferred return type is `Promise<<Name>Response>`:

  ```ts
  export interface IGetLatestMeasurementsRequest {}

  export type GetLatestMeasurementsResponse = {
    measurements: StoreMeasurement[]
  }

  export async function getLatestMeasurements(request: IGetLatestMeasurementsRequest) {
    const response: GetLatestMeasurementsResponse = await storeClient().get(
      storeRoutes.latestMeasurements,
      LatestMeasurementsResponse,
    )
    return response
  }
  ```

## BFF boundary

- UI code must never import `@bbferm/store-contract`. RPC functions in `src/clients/` validate Store responses with Store's contract; server functions then map them into this app's own `*.schemas.ts` shapes. Store shapes and raw sensor payloads must not reach the browser.
- Upstream URLs and credentials are read from `process.env` in `src/clients/<service>/client.ts` only. Never use `VITE_*` for secrets.
- Input validation uses `.validator(...)` in this Start version.
- Server functions are CSRF-protected by Start: requests without same-origin `sec-fetch-site`/`origin` headers get 403.

## PWA

The `pwaAfterStartBuild` plugin in `vite.config.ts` regenerates the service worker after Start prerenders `/_shell.html`, so the shell is precached as the navigation fallback. It relies on plugin internals, so after upgrading Start or vite-plugin-pwa, check that `dist/client/sw.js` contains `createHandlerBoundToURL("/_shell.html")`. Never runtime-cache `/_serverFn/` or `/api/`.

`src/routeTree.gen.ts` is generated by the router plugin. Don't edit it by hand.
