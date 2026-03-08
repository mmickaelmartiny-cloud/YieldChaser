import { aaveAdapter } from "./aave";
import { morphoAdapter } from "./morpho";
import { eulerAdapter } from "./euler";
import type { Protocol, ProtocolAdapter } from "@/types";

export const protocolAdapters: Record<Protocol, ProtocolAdapter> = {
  aave: aaveAdapter,
  morpho: morphoAdapter,
  euler: eulerAdapter,
  // TODO: add compound adapter
  compound: aaveAdapter, // placeholder
};

export { aaveAdapter, morphoAdapter, eulerAdapter };
