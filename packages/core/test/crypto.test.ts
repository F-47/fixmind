import assert from "node:assert/strict";
import test from "node:test";
import { decrypt, deriveKey, encrypt, generateSalt } from "../src/crypto.js";

test("encrypt/decrypt round-trips with the correct key", () => {
  const salt = generateSalt();
  const key = deriveKey("correct horse battery staple", salt);
  const payload = encrypt("hello fixmind", key);
  assert.equal(decrypt(payload, key), "hello fixmind");
});

test("decrypt fails with the wrong passphrase", () => {
  const salt = generateSalt();
  const key = deriveKey("correct horse battery staple", salt);
  const wrongKey = deriveKey("wrong passphrase", salt);
  const payload = encrypt("hello fixmind", key);
  assert.throws(() => decrypt(payload, wrongKey));
});

test("same passphrase and salt derive the same key", () => {
  const salt = generateSalt();
  const keyA = deriveKey("shared passphrase", salt);
  const keyB = deriveKey("shared passphrase", salt);
  assert.equal(keyA.toString("base64"), keyB.toString("base64"));
});
