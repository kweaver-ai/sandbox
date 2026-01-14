# reduce-configs

Merge an initial configuration object with one or more configuration objects, functions, or arrays of configuration objects/functions.

<p>
  <a href="https://npmjs.com/package/reduce-configs">
   <img src="https://img.shields.io/npm/v/reduce-configs?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" />
  </a>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" />
</p>

## Install

```bash
npm add reduce-configs -D
```

## reduceConfigs

The `reduceConfigs` function merges one or more configuration objects into a final configuration. It also allows modification of the configuration object via functions.

- **Type:**

```ts
type OneOrMany<T> = T | T[];
type ConfigChain<T> = OneOrMany<T | ((config: T) => T | void)>;

function reduceConfigs<T>(options: {
  /**
   * Initial configuration object.
   */
  initial: T;
  /**
   * The configuration object, function, or array of configuration objects/functions
   * to be merged into the initial configuration
   */
  config?: ConfigChain<T> | undefined;
  /**
   * The function used to merge configuration objects.
   * @default Object.assign
   */
  mergeFn?: typeof Object.assign;
}): T;
```

- **Example:**

```ts
import { reduceConfigs } from "@rsbuild/core";

const initial = { a: 1, b: 2 };

// Merging an object
const finalConfig1 = reduceConfigs({
  initial: initial,
  config: { b: 3, c: 4 },
});
// -> { a: 1, b: 3, c: 4 }

// Using a function to modify the config
const finalConfig2 = reduceConfigs({
  initial: initial,
  config: (config) => ({ ...config, b: 5, d: 6 }),
});
// -> { a: 1, b: 5, d: 6 }

// Merging an array of objects/functions
const finalConfig3 = reduceConfigs({
  initial: initial,
  config: [
    { b: 7 },
    (config) => ({ ...config, c: 8 }),
    (config) => ({ ...config, d: 9 }),
  ],
});
// -> { a: 1, b: 7, c: 8, d: 9 }
```

## reduceConfigsWithContext

The `reduceConfigsWithContext` function is similar to `reduceConfigs`, which allows you to pass an additional `context` object to the configuration function.

- **Type:**

```ts
type OneOrMany<T> = T | T[];
type ConfigChainWithContext<T, Ctx> = OneOrMany<
  T | ((config: T, ctx: Ctx) => T | void)
>;

function reduceConfigsWithContext<T, Ctx>(options: {
  /**
   * Initial configuration object.
   */
  initial: T;
  /**
   * The configuration object, function, or array of configuration objects/functions
   * to be merged into the initial configuration
   */
  config?: ConfigChain<T> | undefined;
  /**
   * Context object that can be used within the configuration functions.
   */
  ctx?: Ctx;
  /**
   * The function used to merge configuration objects.
   * @default Object.assign
   */
  mergeFn?: typeof Object.assign;
}): T;
```

- **Example:**

```ts
import { reduceConfigsWithContext } from "@rsbuild/core";

const initial = { a: 1, b: 2 };
const context = { user: "admin" };

const finalConfig = reduceConfigsWithContext({
  initial,
  config: [
    { b: 3 },
    (config, ctx) => ({ ...config, c: ctx.user === "admin" ? 99 : 4 }),
  ],
  ctx: context,
});
// -> { a: 1, b: 3, c: 99 }
```

## License

[MIT](./LICENSE).
