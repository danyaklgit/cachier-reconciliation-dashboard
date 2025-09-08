export interface RecordsVerification {
  Recorded: number;
  Verified: number;
  CurrentDayVariances: {
    Outstanding: number;
    Exceptions: number;
  };
  CumulativeVariances: {
    Outstanding: number;
    Exceptions: number;
  };
}

export interface SettlementVerification {
  Claimed: number;
  Settled: number;
  CurrentDayVariances: {
    AwaitingSettlement: number;
    Exceptions: number;
  };
  CumulativeVariances: {
    AwaitingSettlement: number;
    Exceptions: number;
  };
}

export interface DataNode {
  Id: string;
  NodeTag: string;
  NodeLabel: string;
  RecordsVerification: RecordsVerification;
  SettlementVerification: SettlementVerification;
  ChildNodes?: DataNode[];
}

export interface DashboardData {
  AreaId: number;
  AreaCode: string;
  AreaName: string;
  OutletId: number;
  OutletCode: string;
  OutletName: string;
  BusinessDay: string;
  ChildNodes: DataNode[];
}

export interface Filter {
  Tag: string;
  Label: string;
  Values: FilterValue[];
}

export interface FilterValue {
  Code: string;
  Label: string;
}

export interface Topic {
  Tag: string;
  Label: string;
  AvailableFilterTags: string[];
  DefaultFilterHierarchy: string[];
}

// Transaction API Response Types
export interface ColumnProperty {
  ColumnAccessor: string;
  ColumnLabel: string;
  ColumnOrder: number;
  ColumnInfo: string | null;
  IsList: boolean;
}

export interface TransactionAttribute {
  Key: string;
  Value: string;
}

export interface TransactionCharges {
  ContractualFeesAmount: number;
  ContractualVATAmount: number;
  AppliedFeesAmount: number;
  AppliedVATAmount: number;
  AppliedChargesAmount: number;
  ChargesVariance: number;
  ChargesReconciliationStatusTag: string;
  ChargesPostingStatusTag: string;
  PostingsAmount: number;
  PostingsBatchAmount: number;
  PostingsVariance: number;
  BatchReconciliationReference: string;
  BatchReconciliationDate: string;
  BlendedChargesStatusTag: string;
  // Optional fields that might be missing from API
  BlendedChargesStatusName?: string;
  ChargeMismatchNames?: string | null;
}

export interface Transaction {
  TransactionReference: string;
  TransactionDate: string;
  BusinessDay: string;
  BDInstance: number;
  PaymentMethodTag: string;
  PaymentMethodName: string;
  AreaId: number;
  AreaCode: string;
  AreaName: string;
  OutletId: number;
  OutletCode: string;
  OutletName: string;
  TransactionTerminalCode: string;
  RRN: string;
  AuthorizationCode: string;
  Brand: string;
  Customer: string;
  Attributes: TransactionAttribute[];
  TransactionCurrency: string;
  TransactionAmount: number;
  AcquirerTransactionAmount: number;
  TransactionVariance: number;
  InTransitDueDate: string;
  IsInTransitOverdue: boolean;
  ReconciliationStatusTag: string;
  SettlementStatusTag: string;
  BatchTransactionsAmount: number;
  SettlementBatchAmount: number;
  SettlementVariance: number;
  BatchReconciliationReference: string;
  BatchReconciliationDate: string;
  BlendedSettlementStatusTag: string;
  Charges: TransactionCharges;
  // Optional fields that might be missing from API
  BlendedSettlementStatusName?: string;
  MismatchNames?: string | null;
}

export interface TransactionApiResponse {
  ColumnProperties: ColumnProperty[];
  Transactions: Transaction[];
}

export interface Area {
  AreaId: number;
  AreaCode: string;
  AreaName: string;
}

export interface Outlet {
  OutletId: number;
  OutletCode: string;
  OutletName: string;
}

export interface FilterState {
  [key: string]: string[];
}
