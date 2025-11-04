---
timestamp: 'Mon Nov 03 2025 14:36:41 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_143641.528ef4bd.md]]'
content_id: b5b5d23bc302671564b2e290ec12dbee045679b415e56f4f570e7e2b44731f28
---

# response:

You're absolutely right to point that out! When `noImplicitAny` is enabled in TypeScript (which is a good practice for type safety), callback parameters often get flagged as `any` if their types aren't explicitly stated or perfectly inferred.

While the built-in Deno types for `node:crypto` (or `@types/node` in a Node.js context) *should* infer `err` as `Error | null` and `derivedKey` as `Buffer`, sometimes strict configurations or specific Deno/TypeScript versions can cause this error.

The fix is to explicitly type the callback parameters in the `crypto.scrypt` function.

Here's the updated `hashPassword` method:

```typescript
// ... (rest of the class code)

export default class UserAuthenticationConcept {
  // ... (existing properties and constructor)

  /**
   * Hashes a plain-text password using the scrypt algorithm with a given salt.
   * @param {string} password The plain-text password to hash.
   * @param {string} salt The hexadecimal string representation of the salt to use.
   * @returns {Promise<string>} A promise that resolves to the hexadecimal string of the hashed password.
   * @throws {Error} If the hashing process fails.
   */
  private async hashPassword(password: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Convert the hexadecimal salt string back into a Buffer for scrypt
      const saltBuffer = Buffer.from(salt, 'hex');
      crypto.scrypt(
        password,
        saltBuffer,
        KEY_LENGTH_BYTES,
        { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P },
        (err: Error | null, derivedKey: Buffer) => { // <--- Explicitly type err and derivedKey here
          if (err) {
            return reject(err); // It's good practice to `return` after reject/resolve
          }
          resolve(derivedKey.toString('hex'));
        },
      );
    });
  }

  // ... (rest of the class methods)
}
```

By adding `err: Error | null` and `derivedKey: Buffer` to the callback signature, you explicitly tell TypeScript the types of these parameters, resolving the "implicitly any" error and improving type safety.
