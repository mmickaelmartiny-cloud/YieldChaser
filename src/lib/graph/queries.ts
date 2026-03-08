import { gql } from "urql";

export const AAVE_RATES_QUERY = gql`
  query AaveRates($assets: [String!]!) {
    reserves(where: { underlyingAsset_in: $assets }) {
      id
      symbol
      underlyingAsset
      liquidityRate
      variableBorrowRate
      totalLiquidity
      totalCurrentVariableDebt
      utilizationRate
    }
  }
`;

// The Graph subgraph endpoints per protocol/chain
export const SUBGRAPH_URLS: Record<string, Record<number, string>> = {
  aave: {
    // TODO: add actual subgraph URLs from The Graph
    // 1: "https://api.thegraph.com/subgraphs/name/aave/protocol-v3",
  },
};
