import { apiFetch } from "@/lib/api";

export interface BillingUser {
  id: string;
  email: string | null;
  wallet_address: string | null;
  plan_id: string | null;
}

export interface BillingSubscription {
  id: string;
  plan_id: string;
  provider: string;
  status: string;
  expires_at: string | null;
}

export interface BillingPayment {
  id: string;
  user_id: string;
  subscription_id: string | null;
  provider: string;
  status: string;
  amount: string;
  currency: string;
  external_payment_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  user: BillingUser | null;
  subscription: BillingSubscription | null;
}

export interface BillingPaymentsResponse {
  items: BillingPayment[];
}

export interface BillingProfileFields {
  billing_name: string | null;
  billing_company: string | null;
  billing_tax_id: string | null;
  billing_line1: string | null;
  billing_line2: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
}

export interface BillingProfileResponse {
  company_billing: {
    address: string[];
    email: string;
  };
  profile: BillingProfileFields | null;
  synced_stripe_customer_ids?: string[];
}

export async function getBillingPayments(token: string): Promise<BillingPaymentsResponse> {
  return apiFetch<BillingPaymentsResponse>("/billing/payments", token);
}

export async function getBillingPayment(token: string, paymentId: string): Promise<BillingPayment> {
  return apiFetch<BillingPayment>(`/billing/payments/${paymentId}`, token);
}

export async function getBillingProfile(token: string): Promise<BillingProfileResponse> {
  return apiFetch<BillingProfileResponse>("/billing/profile", token);
}

export async function updateBillingProfile(
  token: string,
  profile: BillingProfileFields
): Promise<BillingProfileResponse> {
  return apiFetch<BillingProfileResponse>("/billing/profile", token, {
    method: "PUT",
    body: JSON.stringify(profile),
  });
}
