# US Social Security Tools

A small, well-tested TypeScript library for **working with U.S. Social Security Numbers (SSNs)** in UI and backend code.

It provides:

* ✅ **Validation** (strict + typing-as-you-go, boolean API)
* 🔁 **Normalization** (deterministic, UI-friendly formatting)
* 🎭 **Masking** (privacy-first, best-effort, never validates)
* 🎲 **Generation** (pre-2011, post-2011, random, and publicly advertised SSNs)
* 🧩 **Zod & Yup adapters** for form validation

> **Design principles**
>
> * Validation answers *“is this valid?”* — nothing more.
> * Normalization formats input for display and typing UX.
> * Masking never leaks digits and never enforces validity.
> * Public safety beats convenience.

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
  isValidSsn,
  normaliseSsn,
  formatSsnFromDigits,
  maskSsn,
  generateSsn,
} from "us-ssn-tools";

import { zodSsnTyping, zodSsnSubmit } from "us-ssn-tools/zod";
import { yupSsnTyping, yupSsnSubmit } from "us-ssn-tools/yup";
```

---

## Validation

### `isValidSsn(input, options): boolean`

Checks whether an SSN is valid according to U.S. rules.

* Returns **`true` or `false` only**
* Does **not** normalize
* Can validate *partial input* (“valid so far”)

```ts
isValidSsn("123-45-6789"); // true
isValidSsn("123456789");  // false (dashes required by default)
```

### Options

```ts
type ValidateSsnOptions = {
  requireDashes?: boolean;   // default: true
  allowPartial?: boolean;    // default: false
  ruleMode?: "pre2011" | "post2011"; // default: "post2011"
};
```

### Examples

```ts
isValidSsn("9", { allowPartial: true });
// true (still potentially valid)

isValidSsn("900", { allowPartial: true });
// false (invalid area)

isValidSsn("773-12-3456", { ruleMode: "pre2011" });
// false

isValidSsn("773-12-3456", { ruleMode: "post2011" });
// true
```

---

## Normalization

### `normaliseSsn(input, options): string`

Formats input for **UI display**.
It does **not validate** and never throws.

* Extracts digits
* Optionally inserts dashes
* Supports typing-as-you-go
* Allows overflow digits if desired

```ts
normaliseSsn("1234");        // "123-4"
normaliseSsn("123456789");  // "123-45-6789"
normaliseSsn("SSN: 12a3");  // "123"
```

### Options

```ts
type NormaliseSsnOptions = {
  allowPartial?: boolean;  // default: true
  digitsOnly?: boolean;    // default: false
  enforceLength?: boolean; // default: false
};
```

### Examples

```ts
normaliseSsn("123456789", { digitsOnly: true });
// "123456789"

normaliseSsn("12345678999");
// "123-45-678999"

normaliseSsn("12345678999", { enforceLength: true });
// "123-45-6789"
```

---

## Formatting (UI helper)

### `formatSsnFromDigits(digits)`

Formats a **digit string** into SSN shape.

```ts
formatSsnFromDigits("123");       // "123"
formatSsnFromDigits("1234");      // "123-4"
formatSsnFromDigits("123456789"); // "123-45-6789"
```

No validation is performed.

---

## Masking (UI-safe)

### `maskSsn(input, options): string`

Masks digits after normalization.

* Always normalizes first
* Never validates
* Never reveals digits unless explicitly allowed
* Safe for **any** UI context

```ts
maskSsn("123-45-6789");
// "***-**-****"

maskSsn("123-45-6789", { revealLast4: true });
// "***-**-6789"
```

### Options

```ts
type MaskSsnOptions = {
  allowPartial?: boolean;   // default: true
  revealLast4?: boolean;    // default: false
  maskChar?: string;        // default: "*"
  digitsOnly?: boolean;     // default: false
  enforceLength?: boolean;  // default: false
};
```

### Typing behavior

```ts
maskSsn("123"); 
// "***"

maskSsn("123-45-6", { revealLast4: true });
// "***-**-6"
```

### Guarantees

* ✔️ Digits are **always masked**
* ✔️ Dashes are never masked
* ✔️ Invalid input is still safely masked
* ✔️ No validation logic inside masking

---

## Generation

### `generateSsn(options): string`

Generates SSNs for testing and development.

```ts
generateSsn();
// one of the publicly advertised SSNs
```

### Options

```ts
type GenerateSsnOptions = {
  mode?: "public" | "pre2011" | "post2011" | "any"; // default: "public"
  digitsOnly?: boolean; // default: false
};
```

### ⚠️ Important note on public usage

> **Only use `mode: "public"` for any SSNs that may be displayed publicly.**

SSNs generated with `"pre2011"`, `"post2011"`, or `"any"` are **syntactically valid** and may correspond to **real individuals**.

If such values are:

* shown in documentation
* used in screenshots
* logged publicly
* included in demos or examples

you risk **exposing a real person to identity theft**.

The `"public"` mode returns **historically documented, publicly advertised SSNs** that are known to be unsafe for real-world use but safe for examples.

```ts
// ✅ Safe for docs, demos, screenshots
generateSsn({ mode: "public" });

// ❌ Never display publicly
generateSsn({ mode: "any" });
generateSsn({ mode: "pre2011" });
generateSsn({ mode: "post2011" });
```

---

## Zod Adapters

### Typing (partial + normalized)

```ts
const schema = zodSsnTyping();

schema.parse("1234"); // "123-4"
schema.parse("900");  // ❌ throws
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

* ✔️ Extensive table-driven Jest tests
* ✔️ Clear separation between:

  * validation
  * normalization
  * masking
  * generation
* ✔️ UI-safe defaults everywhere

---

## Non-Goals

* ❌ No storage or encryption
* ❌ No non-US SSNs (yet)
* ❌ No mutation of user input beyond formatting

---

## License

ISC

---

## Support This Project

If you find this project useful, consider supporting it:

* [Sponsor on GitHub](https://github.com/sponsors/backupbrain)
* [Buy Me a Coffee](https://www.buymeacoffee.com/backupbrain)
* [Ko-fi](https://ko-fi.com/backupbrain)
* [Thanks.dev](https://thanks.dev/u/gh/backupbrain)

Your support is greatly appreciated 🙏
