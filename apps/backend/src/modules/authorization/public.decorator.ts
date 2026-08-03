import { SetMetadata, type CustomDecorator } from "@nestjs/common";

export const IS_PUBLIC_KEY = "is_public";

/** Marks an endpoint as reachable without an access token. */
export function Public(): CustomDecorator {
  return SetMetadata(IS_PUBLIC_KEY, true);
}
