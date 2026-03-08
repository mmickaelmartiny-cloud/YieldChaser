import { aaveAdapter } from "./aave";
import { morphoAdapter } from "./morpho";
import { eulerAdapter } from "./euler";
import { compoundAdapter } from "./compound";
import { metamorphoAdapter } from "./metamorpho";
import type { Protocol, ProtocolAdapter } from "@/types";

export const protocolAdapters: Record<Protocol, ProtocolAdapter> = {
  aave: aaveAdapter,
  morpho: morphoAdapter,
  euler: eulerAdapter,
  compound: compoundAdapter,
  metamorpho: metamorphoAdapter,
};

export { aaveAdapter, morphoAdapter, eulerAdapter, compoundAdapter, metamorphoAdapter };
