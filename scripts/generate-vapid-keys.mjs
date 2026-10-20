import { webcrypto } from "node:crypto";

const pair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const publicKey = Buffer.from(await webcrypto.subtle.exportKey("raw", pair.publicKey)).toString("base64url");
const privateJwk = await webcrypto.subtle.exportKey("jwk", pair.privateKey);
if (!privateJwk.d) throw new Error("Could not export the VAPID private key.");
process.stdout.write(`${JSON.stringify({ publicKey, privateKey: privateJwk.d }, null, 2)}\n`);
