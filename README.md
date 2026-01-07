# US Social Security Tools

A small, well-tested TypeScript library for **working with U.S. Social Security Numbers (SSNs)** in UI and backend code.

It provides:

* ✅ **Validation** (strict + typing-as-you-go)
* 🔁 **Normalization** (canonical `###-##-####` formatting)
* 🎭 **Masking** (UI-safe, best-effort, privacy-first)
* 🎲 **Generation** (pre-2011, post-2011, random, and publicly advertised SSNs)
* 🧩 **Zod & Yup adapters** for form validation

> **Design principle:**
> Validation enforces rules.
> Masking never leaks data.
> Normalization is deterministic and UI-friendly.

---

## Installation

```bash
npm install us-ssn-tools
```

or

```bash
yarn add us-ssn-tools
```

---

## Imports

```ts
import {
  validateSsn,
  normalizeSsnInput,
  formatSsnFromDigits,
  maskSsn,
  generateSsn,
} from "us-ssn-tools";

import { zodSsnTyping, zodSsnSubmit } from "us-ssn-tools/zod";
import { yupSsnTyping, yupSsnSubmit } from "us-ssn-tools/yup";
```

---

## Validation

### `validateSsn(input, options)`

Validates an SSN according to U.S. rules.

```ts
const result = validateSsn("123-45-6789");

if (result.ok) {
  console.log(result.normalized); // "123-45-6789"
} else {
  console.log(result.error);   // e.g. "INVALID_AREA"
  console.log(result.message); // human-readable explanation
}
```

### Options

```ts
type ValidateSsnOptions = {
  allowNoDashes?: boolean; // default true
  allowPartial?: boolean; // default false
  ruleMode?: "pre2011" | "post2011" | "both"; // default "both"
};
```

#### Examples

```ts
validateSsn("123456789"); // ok (normalized to "123-45-6789")

validateSsn("9", { allowPartial: true }); 
// ❌ INVALID_AREA (impossible prefix)

validateSsn("773-12-3456", { ruleMode: "pre2011" });
// ❌ INVALID_AREA

validateSsn("773-12-3456", { ruleMode: "post2011" });
// ✅ ok
```

---

## Normalization

### `normalizeSsnInput(input, options)`

Parses and formats SSNs **without enforcing full validity**.
Ideal for **typing-as-you-go**.

```ts
const res = normalizeSsnInput("1234", { allowPartial: true });

if (res.ok) {
  res.digits;     // "1234"
  res.normalized; // "123-4"
}
```

### Options

```ts
type NormalizeSsnOptions = {
  allowPartial?: boolean;
  allowNoDashes?: boolean;
};
```

### Examples

```ts
normalizeSsnInput("123456789");
// → { digits: "123456789", normalized: "123-45-6789" }

normalizeSsnInput("123-45-6", { allowPartial: true });
// → { digits: "123456", normalized: "123-45-6" }
```

---

## Formatting (UI helper)

### `formatSsnFromDigits(digits)`

Formats a **digit string** into SSN shape.
This function **does not validate**.

```ts
formatSsnFromDigits("123");       // "123"
formatSsnFromDigits("1234");      // "123-4"
formatSsnFromDigits("123456789"); // "123-45-6789"
```

Used internally by normalization and masking, but safe to use directly for UI.

---

## Masking (UI-safe)

### `maskSsn(input, options)`

Masks digits while **never masking dashes**.
Designed for **privacy-safe UI rendering**, not validation.

```ts
maskSsn("123-45-6789");
// "***-**-****"

maskSsn("123-45-6789", { revealLast4: true });
// "***-**-6789"
```

### Options

```ts
type MaskSsnOptions = {
  allowPartial?: boolean;      // default false
  revealLast4?: boolean;       // default false
  maskChar?: string;           // default "*"
  dashMode?: "normalize" | "preserve"; // default "normalize"
  allowNoDashes?: boolean;     // default true
};
```

### Partial / typing behavior

```ts
maskSsn("123", { allowPartial: true });
// "***"

maskSsn("123-45-6", { allowPartial: true, revealLast4: true });
// "***-**-6"
```

### Important guarantees

* ✔️ **Digits are always masked** (even on invalid input)
* ✔️ Dashes are never masked
* ✔️ No validation required — safe for UI display

---

## Generation

Generates realistic-looking SSNs for testing, demos, and development.

```ts
generateSsn(); 
// e.g. "509-21-4837"
```

### ⚠️ Important note on public usage

> **Only use `mode: "public"` for any SSNs that may be displayed publicly.**

SSNs generated with `"pre2011"`, `"post2011"`, or `"any"` modes are **syntactically valid** and may correspond to **real individuals**.

If such a value is:

* rendered in documentation
* shown in screenshots
* logged to public consoles
* included in sample data or demos

you risk **exposing a real person to identity theft** if the generated SSN happens to match an existing one.

To prevent this, the library includes a special `"public"` generation mode that returns **historically documented, non-random, publicly advertised SSNs** that are known to be unsafe for real-world use but safe for examples.

### Recommended usage

```ts
// ✅ Safe for docs, demos, screenshots, and public output
generateSsn({ mode: "public" });

// ❌ Do NOT use in any public or user-visible context
generateSsn({ mode: "any" });
generateSsn({ mode: "pre2011" });
generateSsn({ mode: "post2011" });
```

Use non-public modes **only** for:

* internal testing
* private development environments
* automated test data that is never exposed

This distinction exists to protect real people, not just to satisfy validation rules.

---

## Zod Adapters

### Typing (partial + normalized)

```ts
const schema = zodSsnTyping();

schema.parse("1234"); // "123-4"
schema.parse("9");    // ❌ throws (impossible prefix)
```

### Submit (strict)

```ts
const schema = zodSsnSubmit();

schema.parse("123456789"); // "123-45-6789"
schema.parse("123-45-6");  // ❌ throws
```

---

## Yup Adapters

```ts
await yupSsnTyping().validate("1234");
// "123-4"

await yupSsnSubmit().validate("123456789");
// "123-45-6789"
```

---

## Testing & Guarantees

* ✔️ 100% table-driven Jest tests
* ✔️ Deterministic RNG support
* ✔️ Strict separation between:

  * validation
  * formatting
  * masking
  * generation

---

## Non-Goals

* ❌ No storage or encryption
* ❌ No non-US SSNs (yet)
* ❌ No implicit trimming or mutation of user input

---

## License

ISC

## Support This Project

If you find this project useful, consider supporting me to help keep it maintained and improved:

- [Sponsor on GitHub](https://github.com/sponsors/backupbrain)
- [Buy Me a Coffee](https://www.buymeacoffee.com/backupbrain)
- [Ko-fi](https://ko-fi.com/backupbrain)
- [Thanks.dev](https://thanks.dev/u/gh/backupbrain)

Your support is greatly appreciated!