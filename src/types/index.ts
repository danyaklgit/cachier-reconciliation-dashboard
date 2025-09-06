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
