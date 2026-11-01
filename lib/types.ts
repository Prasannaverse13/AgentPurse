export type AgentStatus = 'active' | 'frozen';

export type Agent = {
  id: string;
  name: string;
  kind: string;
  initials: string;
  key: string; // secret agent key, sent as Bearer token
  dailyCap: number;
  autoApproveLimit: number;
  status: AgentStatus;
  frozenReason?: string;
  shops: string[]; // allow list (lower case match on merchant name)
  createdAt: string;
};

export type RuleKind =
  | 'ask_over' // ask owner when amount > value
  | 'block_over' // block when amount > value
  | 'allow_list_only' // merchant must be on the agent allow list
  | 'block_keywords' // block when item/merchant contains any of words
  | 'require_keywords' // ask owner unless item/reason contains all words
  | 'velocity_freeze' // freeze wallet when spend in last hour > factor x normal hour
  | 'time_window'; // ask owner outside allowed hours (UTC hours)

export type Rule = {
  id: string;
  agentId: string | null; // null = all agents
  text: string; // the plain words the owner typed
  kind: RuleKind;
  params: { value?: number; words?: string[]; factor?: number; from?: number; to?: number };
  on: boolean;
  parsedBy: 'ai' | 'heuristic' | 'seed';
  createdAt: string;
};

export type Check = { rule: string; ok: boolean; effect: 'pass' | 'ask' | 'block' | 'freeze' };

export type TxnStatus = 'pending' | 'paid' | 'blocked' | 'declined' | 'refunded' | 'failed';

export type Txn = {
  id: string;
  agentId: string;
  agentName: string;
  item: string;
  merchant: string;
  merchantEmail: string;
  amount: number;
  currency: 'USD';
  reason: string; // why the agent wants it
  productUrl?: string; // product link from Channel3, if the agent searched first
  productImage?: string;
  status: TxnStatus;
  decidedBy: 'rules' | 'owner' | null;
  checks: Check[];
  flag?: string; // short headline of why it needs a yes or was blocked
  aiNote?: string; // AI risk note for the owner
  paypal?: { batchId?: string; itemId?: string; itemStatus?: string; refundNote?: string };
  createdAt: string;
  updatedAt: string;
};

export type Funding = {
  id: string;
  orderId: string;
  captureId?: string;
  amount: number;
  refunded: number;
  status: 'created' | 'captured' | 'refunded';
  createdAt: string;
};

export type DB = {
  balance: number; // purse balance in USD held on the platform
  agents: Agent[];
  rules: Rule[];
  txns: Txn[];
  fundings: Funding[];
  events: { at: string; text: string }[];
};
