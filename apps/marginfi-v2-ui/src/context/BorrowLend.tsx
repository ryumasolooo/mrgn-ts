import React from "react";
import {
  aprToApy,
  getConfig,
  MarginfiClient,
  MarginfiReadonlyClient,
} from "@mrgnlabs/marginfi-client-v2";
import MarginfiAccount from "@mrgnlabs/marginfi-client-v2/src/account";
import Bank from "@mrgnlabs/marginfi-client-v2/src/bank";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  FC,
  useState,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { computeAccountSummary, DEFAULT_ACCOUNT_SUMMARY } from "../api";
import { AccountSummary } from "~/types";
import { useTokenMetadata } from "./TokenMetadata";

// @ts-ignore - Safe because context hook checks for null
const BorrowLendContext = createContext<BorrowLendState>();

interface BorrowLendState {
  fetching: boolean;
  refreshData: () => Promise<void>;
  mfiClient: MarginfiClient | null;
  userAccounts: MarginfiAccount[];
  selectedAccount: MarginfiAccount | null;
  banks: Bank[];
  accountSummary: AccountSummary;
}

const BorrowLendStateProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const { tokenMetadataMap } = useTokenMetadata();

  const mfiConfig = useMemo(() => getConfig("devnet1"), []);

  // User-agnostic state
  const [fetching, setFetching] = useState<boolean>(true);
  const [mfiReadonlyClient, setMfiReadonlyClient] =
    useState<MarginfiReadonlyClient>();
  const [mfiClient, setMfiClient] = useState<MarginfiClient | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);

  // User-specific state
  const [userAccounts, setUserAccounts] = useState<MarginfiAccount[]>([]);
  const [selectedAccount, setSelectedAccount] =
    useState<MarginfiAccount | null>(null);
  const [accountSummary, setAccountSummary] = useState<AccountSummary>(
    DEFAULT_ACCOUNT_SUMMARY
  );

  useEffect(() => {
    (async function () {
      const roClient = await MarginfiReadonlyClient.fetch(
        mfiConfig,
        connection
      );
      setMfiReadonlyClient(roClient);

      if (!anchorWallet) return;

      const client = await MarginfiClient.fetch(
        mfiConfig,
        //@ts-ignore
        anchorWallet,
        connection
      );
      setMfiClient(client);
    })();
  }, [anchorWallet, mfiConfig, connection]);

  const refreshUserData = useCallback(async () => {
    if (!mfiClient) return;
    const userAccounts = await mfiClient.getMarginfiAccountsForAuthority();
    setUserAccounts(userAccounts);

    if (userAccounts.length > 0) {
      setSelectedAccount(userAccounts[0]);
    }
  }, [mfiClient]);

  const refreshGroupData = useCallback(async () => {
    if (!mfiReadonlyClient) return;
    await mfiReadonlyClient.group.reload();
    setBanks([...mfiReadonlyClient.group.banks.values()]);
  }, [mfiReadonlyClient]);

  const refreshData = useCallback(async () => {
    setFetching(true);
    await Promise.all([await refreshGroupData(), await refreshUserData()]);
    setFetching(false);
  }, [refreshGroupData, refreshUserData]);

  // Update group state
  useEffect(() => {
    refreshGroupData();
  }, [refreshGroupData]);

  // Update user state
  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  // Periodically update all data
  useEffect(() => {
    refreshData();
    const id = setInterval(refreshData, 60_000);
    return () => clearInterval(id);
  }, [refreshData]);

  useEffect(() => {
    if (selectedAccount === null) return;
    setAccountSummary(computeAccountSummary(selectedAccount, tokenMetadataMap));
  }, [selectedAccount, tokenMetadataMap]);

  return (
    <BorrowLendContext.Provider
      value={{
        fetching,
        refreshData,
        mfiClient,
        accountSummary,
        banks,
        selectedAccount,
        userAccounts,
      }}
    >
      {children}
    </BorrowLendContext.Provider>
  );
};

const useBorrowLendState = () => {
  const context = useContext(BorrowLendContext);
  if (!context) {
    throw new Error(
      "useBorrowLendState must be used within a BorrowLendStateProvider"
    );
  }

  return context;
};

export { useBorrowLendState, BorrowLendStateProvider };
