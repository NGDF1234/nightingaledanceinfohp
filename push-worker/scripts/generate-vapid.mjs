import { generateKeyPairSync } from "node:crypto";

const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const jwk = privateKey.export({ format: "jwk" });
const publicBytes = Buffer.concat([
  Buffer.from([4]),
  Buffer.from(jwk.x, "base64url"),
  Buffer.from(jwk.y, "base64url")
]);
process.stdout.write(JSON.stringify({
  publicKey: publicBytes.toString("base64url"),
  privateKey: jwk.d
}));
