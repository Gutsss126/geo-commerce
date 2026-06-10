import { randomBytes } from "crypto";

export function generateApiKey() {
  return `geo_${randomBytes(24).toString("hex")}`;
}
