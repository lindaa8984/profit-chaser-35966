import { User, Vault, Customer, ExchangeRate, Transaction, Supplier } from '@/types';

const STORAGE_KEYS = {
  users: 'exchange_users',
  currentUser: 'exchange_current_user',
  vaults: 'exchange_vaults',
  customers: 'exchange_customers',
  suppliers: 'exchange_suppliers',
  rates: 'exchange_rates',
  transactions: 'exchange_transactions',
};

export const storage = {
  // Users
  getUsers: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEYS.users);
    return data ? JSON.parse(data) : [];
  },
  saveUsers: (users: User[]) => {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  },
  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.currentUser);
    return data ? JSON.parse(data) : null;
  },
  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.currentUser);
    }
  },

  // Vaults
  getVaults: (): Vault[] => {
    const data = localStorage.getItem(STORAGE_KEYS.vaults);
    return data ? JSON.parse(data) : [];
  },
  saveVaults: (vaults: Vault[]) => {
    localStorage.setItem(STORAGE_KEYS.vaults, JSON.stringify(vaults));
  },

  // Customers
  getCustomers: (): Customer[] => {
    const data = localStorage.getItem(STORAGE_KEYS.customers);
    return data ? JSON.parse(data) : [];
  },
  saveCustomers: (customers: Customer[]) => {
    localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(customers));
  },

  // Suppliers
  getSuppliers: (): Supplier[] => {
    const data = localStorage.getItem(STORAGE_KEYS.suppliers);
    return data ? JSON.parse(data) : [];
  },
  saveSuppliers: (suppliers: Supplier[]) => {
    localStorage.setItem(STORAGE_KEYS.suppliers, JSON.stringify(suppliers));
  },

  // Exchange Rates
  getRates: (): ExchangeRate[] => {
    const data = localStorage.getItem(STORAGE_KEYS.rates);
    return data ? JSON.parse(data) : [];
  },
  saveRates: (rates: ExchangeRate[]) => {
    localStorage.setItem(STORAGE_KEYS.rates, JSON.stringify(rates));
  },

  // Transactions
  getTransactions: (): Transaction[] => {
    const data = localStorage.getItem(STORAGE_KEYS.transactions);
    return data ? JSON.parse(data) : [];
  },
  saveTransactions: (transactions: Transaction[]) => {
    localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions));
  },

  // Initialize default data
  initializeDefaults: () => {
    // Create default admin user
    const users = storage.getUsers();
    if (users.length === 0) {
      const defaultAdmin: User = {
        id: '1',
        username: 'admin',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      storage.saveUsers([defaultAdmin]);
    }

    // Create default vault
    const vaults = storage.getVaults();
    if (vaults.length === 0) {
      const defaultVault: Vault = {
        id: '1',
        name: 'الخزنة الرئيسية',
        balanceSDG: 0,
        balanceAED: 0,
        initialBalanceSDG: 0,
        initialBalanceAED: 0,
        description: 'الخزنة الرئيسية للصرافة',
        isMainVault: true,
        createdAt: new Date().toISOString(),
      };
      storage.saveVaults([defaultVault]);
    }

    // Create default exchange rate
    const rates = storage.getRates();
    if (rates.length === 0) {
      const defaultRate: ExchangeRate = {
        id: '1',
        buyRate: 200,
        sellRate: 202,
        updatedAt: new Date().toISOString(),
        updatedBy: '1',
      };
      storage.saveRates([defaultRate]);
    }
  },

  // Clear all data
  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },
};
