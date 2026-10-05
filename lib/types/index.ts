// Types mirroring the backend contract in BACKEND_README.md.
// Field names are snake_case exactly as the API returns them.

export type ID = string;

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// ─── Auth (§4) ───────────────────────────────────────────────────────────────

export interface User {
  id: ID;
  email: string;
  full_name: string | null;
  created_at?: string;
  timezone?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  user?: User;
}

// ─── Business profile (§7) ───────────────────────────────────────────────────

export type Goal = "grow_revenue" | "repeat_customers" | "move_inventory" | "stabilize";
export type CustomerStyle = "one_time" | "repeat_heavy" | "relationship_based";
export type BusinessType =
  | "fashion_clothing"
  | "food_consumables"
  | "beauty_personal_care"
  | "services"
  | "general_retail"
  | "other";
export type SalesRhythm = "weekly" | "every_2_weeks" | "monthly" | "irregular" | "custom";
export type SalesChannel = "whatsapp" | "phone" | "in_person" | "mixed";
export type CommunicationTone = "friendly" | "professional" | "warm";
export type PriceRange = "low" | "medium" | "high";

export interface BusinessProfile {
  business_name: string | null;
  currency: "NGN";
  goal: Goal | null;
  customer_style: CustomerStyle | null;
  business_type: BusinessType | null;
  sales_rhythm: SalesRhythm | null;
  custom_rhythm_days: number | null;
  sales_channel: SalesChannel | null;
  communication_tone: CommunicationTone | null;
  price_range: PriceRange | null;
  updated_at?: string;
}

// ─── Products (§8) ───────────────────────────────────────────────────────────

export interface Product {
  id: ID;
  name: string;
  price: number;
  repurchase_days: number | null;
  is_replenishable: boolean | null;
  created_at?: string;
  updated_at?: string;
  stats?: { units_sold: number; revenue: number; last_sold_at: string | null };
}

export type ProductInput = Pick<Product, "name" | "price" | "repurchase_days" | "is_replenishable">;

// ─── Customers (§9) ──────────────────────────────────────────────────────────

export type CustomerStatus = "new" | "active" | "at_risk" | "lapsed";

export interface Customer {
  id: ID;
  name: string;
  phone: string | null;
  email: string | null;
  note: string | null;
  created_at: string;
  updated_at?: string;
  total_spent?: number;
  purchase_count?: number;
  last_purchase_at?: string | null;
  status?: CustomerStatus;
}

export interface CustomerInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  note?: string | null;
}

export interface CustomerActivity {
  type: "sale" | "follow_up_done" | "customer_created" | string;
  sale_id?: ID;
  label: string;
  amount?: number;
  at: string;
}

export interface CustomerDetail extends Customer {
  status: CustomerStatus;
  stats: {
    total_spent: number;
    purchase_count: number;
    units_purchased: number;
    average_order_value: number;
    first_purchase_at: string | null;
    last_purchase_at: string | null;
    days_since_last_purchase: number | null;
  };
  revenue_by_month: { month: string; revenue: number }[];
  top_products: {
    product_id: ID | null;
    product_name: string;
    units: number;
    revenue: number;
    last_purchased_at: string | null;
  }[];
  recent_activity: CustomerActivity[];
  next_follow_up: { product_name: string; expected_at: string; status: FollowUpStatus } | null;
}

// ─── Sales (§10) ─────────────────────────────────────────────────────────────

export type SaleSource = "manual" | "voice";

export interface Sale {
  id: ID;
  customer_id: ID | null;
  customer_name: string | null;
  product_id: ID | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  amount: number;
  source: SaleSource;
  transcript: string | null;
  note: string | null;
  sold_at: string;
  created_at: string;
  updated_at?: string;
}

export interface SaleInput {
  customer_id?: ID | null;
  customer_name?: string | null;
  product_id?: ID | null;
  product_name?: string | null;
  quantity: number;
  unit_price?: number | null;
  amount?: number | null;
  sold_at?: string | null;
  note?: string | null;
  source?: SaleSource;
  transcript?: string | null;
}

// ─── Voice (§11) ─────────────────────────────────────────────────────────────

export interface VoiceAskResponse {
  session_id?: ID;
  question?: string;
  answer: string;
  created_at?: string;
  /** "log_sale" when the owner reported a sale; `sale` is set only if it was saved. */
  intent?: "question" | "log_sale";
  sale?: Sale | null;
  draft?: SaleDraft | null;
  missing_fields?: string[];
}

export interface SaleDraft {
  product_name: string | null;
  product_id: ID | null;
  quantity: number | null;
  unit_price: number | null;
  amount: number | null;
  customer_name: string | null;
  customer_id: ID | null;
  sold_at: string | null;
}

export interface VoiceLogSaleResponse {
  transcript: string;
  saved: boolean;
  draft: SaleDraft;
  confidence: number;
  missing_fields: string[];
  candidates?: {
    customers: { id: ID; name: string }[];
    products: { id: ID; name: string }[];
  };
  warnings?: string[];
  sale: Sale | null;
}

export interface VoiceSessionSummary {
  id: ID;
  title: string;
  created_at: string;
  duration_sec: number;
  turn_count: number;
  preview: string;
}

export interface VoiceSessionDetail {
  id: ID;
  title: string;
  created_at: string;
  duration_sec: number;
  turns: { role: "user" | "assistant"; text: string; created_at: string }[];
}

// ─── Analytics (§12) ─────────────────────────────────────────────────────────

export interface TopProduct {
  product_name: string;
  product_id?: ID | null;
  total_quantity: number;
  total_revenue: number;
  share_of_revenue?: number;
}

export interface AnalyticsSummary {
  currency?: "NGN";
  total_revenue: number;
  total_transactions: number;
  total_units?: number;
  unique_customers?: number;
  average_order_value?: number;
  top_products: TopProduct[];
}

export interface DashboardAnalytics {
  currency: "NGN";
  timezone: string;
  generated_at: string;
  revenue: {
    today: number;
    this_week: number;
    last_week: number;
    this_month: number;
    last_month: number;
    all_time: number;
  };
  transactions: { today: number; this_week: number; this_month: number; all_time: number };
  growth: { month_over_month_pct: number | null; week_over_week_pct: number | null };
  customers: { total: number; new_this_month: number; at_risk: number };
  follow_ups: { overdue: number; due_today: number; due_soon: number };
  top_product: { product_name: string; total_revenue: number } | null;
}

export type TimeRange = "7d" | "30d" | "90d";

export interface TimeseriesPoint {
  start: string;
  label: string;
  revenue: number;
  transactions: number;
  units: number;
}

export interface Timeseries {
  range: string;
  interval: "day" | "week" | "month";
  currency: "NGN";
  points: TimeseriesPoint[];
  totals: { revenue: number; transactions: number; units: number };
  previous_period_totals: { revenue: number; transactions: number; units: number };
  change_pct: number | null;
  average_per_interval: number;
  best_interval: { start: string; label: string; revenue: number } | null;
}

export interface ProductBreakdown {
  items: {
    product_id: ID | null;
    product_name: string;
    units: number;
    revenue: number;
    share_of_revenue: number;
    change_pct: number | null;
  }[];
  total_revenue: number;
}

// ─── Follow-ups (§13) ────────────────────────────────────────────────────────

export type FollowUpStatus = "overdue" | "due_today" | "due_soon" | "upcoming";

export interface FollowUp {
  key: string;
  customer: { id: ID; name: string; phone: string | null; email: string | null };
  product: { id: ID | null; name: string };
  status: FollowUpStatus;
  last_purchase_at: string;
  expected_at: string;
  days_overdue: number | null;
  days_until: number | null;
  interval_days: number;
  interval_source: "history" | "product" | "business_rhythm";
  purchase_count: number;
  confidence: number;
  suggested_message: string | null;
  whatsapp_url: string | null;
  tel_url: string | null;
}

export interface FollowUpList {
  items: FollowUp[];
  total: number;
  counts: { overdue: number; due_today: number; due_soon: number; upcoming: number };
}

// ─── Insights (§14) ──────────────────────────────────────────────────────────

export type InsightCategory = "revenue" | "customers" | "sales" | "risk" | "growth";

export interface InsightData {
  id: string;
  category: InsightCategory;
  priority: "high" | "medium" | "low";
  title: string;
  summary: string;
  trend: "up" | "down" | "neutral";
  trend_value: string;
  confidence: number;
  cta_label: string | null;
  cta_route: string | null;
  supporting: { label: string; value: string; sub?: string }[];
}

export interface RecommendationData {
  id: string;
  priority: "urgent" | "high" | "normal";
  impact: "high" | "medium" | "low";
  title: string;
  description: string;
  action_label: string;
  action_route: string | null;
  estimated_gain: string | null;
}

export interface InsightsResponse {
  range: TimeRange;
  generated_at: string;
  based_on: { customers: number; transactions: number; products: number };
  insights: InsightData[];
  recommendations: RecommendationData[];
  ai_narrative: { text: string; generated_at: string } | null;
  data_sources: { name: string; record_count: number; last_updated_at: string | null; status: string }[];
  data_quality: { score: number; issues: string[] };
}

// ─── AI (§15) ────────────────────────────────────────────────────────────────

export interface ChatTurn {
  role: "user" | "model";
  content: string;
}

export interface ChatResponse {
  answer: string;
  conversation_id?: ID;
  message_id?: ID;
  created_at?: string;
}

export interface ConversationSummary {
  id: ID;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ConversationDetail {
  id: ID;
  title: string;
  created_at: string;
  messages: { id: ID; role: "user" | "assistant"; content: string; created_at: string }[];
}

// ─── Notifications (§16) ─────────────────────────────────────────────────────

export interface AppNotification {
  id: ID;
  type: string;
  title: string;
  body: string;
  link: string | null;
  created_at: string;
  read: boolean;
}

// ─── Templates (§17) ─────────────────────────────────────────────────────────

export interface MessageTemplate {
  id: ID;
  name: string;
  body: string;
  is_default?: boolean;
  created_at: string;
  updated_at?: string;
}
