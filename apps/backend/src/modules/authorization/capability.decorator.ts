import { SetMetadata, type CustomDecorator } from "@nestjs/common";
import type { CapabilityId } from "../platform-foundation/domain/platform-foundation";

export const REQUIRED_CAPABILITY_KEY = "required_capability";

export function RequireCapability(capability: CapabilityId): CustomDecorator {
  return SetMetadata(REQUIRED_CAPABILITY_KEY, capability);
}
