export type Currency = 'SDG' | 'AED';

export type TransactionType = 'deposit' | 'withdrawal' | 'transfer';

export type ExchangeDirection = 'normal' | 'reverse'; // normal: AED to SDG, reverse: SDG to AED

export type TransactionStatus = 'pending' | 'confirmed' | 'approved' | 'cancelled' | 'in_transit' | 'delivered';

export type UserRole = 'admin' | 'accountant' | 'viewer';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
}

export interface Vault {
  id: string;
  name: string;
  balanceSDG: number;
  balanceAED: number;
  balanceUSD?: number;
  balanceSAR?: number;
  balanceCash?: number;
  initialBalanceSDG?: number;
  initialBalanceAED?: number;
  initialBalanceUSD?: number;
  initialBalanceSAR?: number;
  initialBalanceCash?: number;
  description?: string;
  isMainVault?: boolean;
  isForeignCurrency?: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  accountNumber?: string;
  phone?: string;
  email?: string;
  whatsappNumber?: string;
  whatsappGroup?: string;
  balanceSDG: number;
  balanceAED: number;
  balanceUSD?: number;
  balanceSAR?: number;
  isRecurring: boolean;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  whatsappNumber?: string;
  whatsappGroup?: string;
  notes?: string;
  createdAt: string;
}

export interface ExchangeRate {
  id: string;
  buyRate: number;
  sellRate: number;
  updatedAt: string;
  updatedBy: string;
}

export interface Transaction {
  id: string;
  transactionNumber: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: Currency;
  vaultId?: string;
  customerId?: string;
  exchangeRate?: number;
  profitLoss?: number;
  fromVaultId?: string;
  toVaultId?: string;
  fromCustomerId?: string;
  toCustomerId?: string;
  fromCurrency?: Currency;
  toCurrency?: Currency;
  exchangeDirection?: ExchangeDirection;
  isDirectDelivery?: boolean;
  isBanakTransfer?: boolean;
  bankOperationNumber?: string; // رقم العملية البنكية (5 أرقام)
  whatsappNumber?: string;
  whatsappMessage?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
  confirmedAt?: string;
  confirmedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface SupplierRate {
  supplierId: string;
  rate: number;
  amount: number;
  whatsappNumber?: string;
}
