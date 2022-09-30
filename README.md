# Denash / Deno Bash

A silly little bash interpreter written in TypeScript for
[Deno](https://deno.land/).

Run like so:

```bash
deno run --allow-read https://deno.land/x/denash/mod.ts my-script.sh
```

## Features

Take a look at [mod.test.ts](mod.test.ts) if you want to know what it can do
already :)

---

### TODO

- [ ] shorthand conditionals like `[ a = b ] && echo foo`
- [ ] handle error codes from external commands and `set -e`
- [ ] switch case statement
- [ ] more builtins
- [ ] file utilities / globbing
