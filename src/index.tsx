import { List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import got from "got";
import { useState, useEffect } from "react";
import groupBy from "lodash.groupby";

export interface Amount {
  currencyCode: string;
  value: string;
  valueInBaseUnits: number;
}

interface Account {
  type: "accounts";
  id: string;
  attributes: {
    displayName: string;
    accountType: string;
    ownershipType: string;
    balance: Amount;
    createdAt: string;
  };
  relationships: {
    transactions: {
      links: {
        related: string;
      };
    };
  };
}

// Generated by https://quicktype.io

export interface Transaction {
  type: string;
  id: string;
  attributes: Attributes;
}

export interface Attributes {
  status: string;
  rawText: null;
  description: string;
  message: string;
  isCategorizable: boolean;
  holdInfo: null;
  roundUp: null;
  cashback: null;
  amount: Amount;
  foreignAmount: null;
  cardPurchaseMethod: null;
  settledAt: string;
  createdAt: string;
}

interface Preferences {
  token: string;
}

export default function Command() {
  const [accounts, setAccounts] = useState<{ [key: string]: Account[] }>({});
  const [loading, setLoading] = useState(false);
  const { token } = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function fetchAccounts() {
      setLoading(true);
      try {
        const { data } = await got
          .get("https://api.up.com.au/api/v1/accounts", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          .json<{ data: Account[] }>();

        console.log(groupBy(data, "attributes.accountType"));
        setAccounts(groupBy(data, "attributes.accountType"));
      } catch (e) {
        await showToast({ title: "Failed to get accounts from Up", style: Toast.Style.Failure });
      } finally {
        setLoading(false);
      }
    }

    fetchAccounts();
  }, []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  async function loadRecentTransactions(transactionUrl?: string) {
    if (!transactionUrl) {
      setLoadingTransactions(false);
      setTransactions([]);
      return;
    }

    setLoadingTransactions(true);
    try {
      const { data } = await got
        .get(transactionUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .json<{ data: Transaction[] }>();

      setTransactions(data);
    } catch (e) {
      await showToast({ title: "Failed to get transactions from Up", style: Toast.Style.Failure });
    }

    setLoadingTransactions(false);
  }

  return (
    <List isLoading={loading} isShowingDetail onSelectionChange={(url) => loadRecentTransactions(url)}>
      {Object.entries(accounts).map(([type, accounts]) => (
        <List.Section title={type}>
          {accounts.map((account) => {
            const formatter = new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: account.attributes.balance.currencyCode,
            });

            return (
              <List.Item
                id={account.relationships.transactions.links.related}
                key={account.id}
                title={account.attributes.displayName}
                accessories={[{ text: formatter.format(account.attributes.balance.value) }]}
                detail={
                  <List.Item.Detail
                    isLoading={loadingTransactions}
                    markdown={!transactions.length && !loadingTransactions ? "No transactions" : undefined}
                    metadata={
                      <List.Item.Detail.Metadata>
                        {transactions.map((transaction) => {
                          const formatter = new Intl.NumberFormat(undefined, {
                            style: "currency",
                            currency: transaction.attributes.amount.currencyCode,
                          });

                          return [
                            <List.Item.Detail.Metadata.Label
                              key={transaction.id}
                              title={transaction.attributes.description}
                              text={formatter.format(transaction.attributes.amount.value)}
                            />,

                            <List.Item.Detail.Metadata.Separator />,
                          ];
                        })}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}