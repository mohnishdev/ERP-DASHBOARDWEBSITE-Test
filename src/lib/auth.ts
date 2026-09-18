export type Account = {
  email: string;
  pass: string;
  name: string;
  role: string;
  modules: "all" | string[];
  type: "admin" | "customer";
};

export const defaultAccounts: Account[] = [
  { email: "admin@jaadlogistics.com", pass: "admin123", name: "Joseph Abidoye", role: "Super Admin", modules: "all", type: "admin" },
  { email: "support@jaadlogistics.com", pass: "support123", name: "Support Agent", role: "Customer Support", modules: ["dashboard", "support"], type: "admin" },
  { email: "customer@jaadlogistics.com", pass: "customer123", name: "EricBoss Furnitures", role: "Customer", modules: [], type: "customer" },
];

export const accountsStorageKey = "jaad_mock_accounts";

export function readAccounts() {
  if (typeof window === "undefined") return defaultAccounts;
  try {
    return [...defaultAccounts, ...(JSON.parse(localStorage.getItem(accountsStorageKey) || "[]") as Account[])];
  } catch {
    return defaultAccounts;
  }
}

export function saveAccount(account: Account) {
  const customAccounts = readAccounts().filter((candidate) => !defaultAccounts.some((defaultAccount) => defaultAccount.email === candidate.email));
  localStorage.setItem(accountsStorageKey, JSON.stringify([...customAccounts, account]));
}
