import { strict as assert } from "node:assert";
import {
  applySubscriptionProfileUpdate,
  currentPeriodEnd,
  planTierForSubscriptionStatus,
  subscriptionProfilePayload,
} from "../api/billing/entitlements.js";
import { billingProfileFromRow, profilePatchColumns } from "../api/profile.js";
import { isPaidPlan } from "../.test-build/src/cloud.js";

function fakeSupabase() {
  const calls = [];
  return {
    calls,
    from(table) {
      return {
        update(payload) {
          return {
            async eq(column, value) {
              calls.push({ table, payload, column, value });
              return { error: null };
            },
          };
        },
      };
    },
  };
}

assert.equal(isPaidPlan({ tier: "free", status: "not_configured" }), false, "Free accounts should not have Pro access");
assert.equal(isPaidPlan({ tier: "pro", status: "active" }), true, "Active Pro subscriptions should unlock paid features");
assert.equal(isPaidPlan({ tier: "pro", status: "trialing" }), true, "Trialing Pro subscriptions should unlock paid features");
assert.equal(isPaidPlan({ tier: "pro", status: "past_due" }), false, "Past-due Pro subscriptions should not unlock paid features");
assert.equal(isPaidPlan({ tier: "pro", status: "canceled" }), false, "Canceled Pro subscriptions should not unlock paid features");
assert.equal(isPaidPlan({ tier: "pro", status: "unpaid" }), false, "Unpaid Pro subscriptions should not unlock paid features");
assert.equal(isPaidPlan({ tier: "pro", status: "paused" }), false, "Paused Pro subscriptions should not unlock paid features");

assert.equal(planTierForSubscriptionStatus("pro", "active"), "pro");
assert.equal(planTierForSubscriptionStatus("pro", "trialing"), "pro");
assert.equal(planTierForSubscriptionStatus("pro", "past_due"), "free");
assert.equal(planTierForSubscriptionStatus("pro", "canceled"), "free");
assert.equal(planTierForSubscriptionStatus("pro", "unpaid"), "free");
assert.equal(planTierForSubscriptionStatus("pro", "incomplete_expired"), "free");

assert.equal(
  currentPeriodEnd({ current_period_end: 1_778_544_000 }),
  "2026-05-12T00:00:00.000Z",
  "Stripe subscription period seconds should be stored as ISO time",
);
assert.equal(currentPeriodEnd({}), null, "missing Stripe subscription period should stay null");

const activePayload = subscriptionProfilePayload({
  customerId: "cus_active",
  tier: "pro",
  status: "active",
  subscriptionId: "sub_active",
  currentPeriodEndIso: "2026-06-12T00:00:00.000Z",
  updatedAt: "2026-05-12T12:00:00.000Z",
});
assert.deepEqual(activePayload, {
  stripe_customer_id: "cus_active",
  subscription_id: "sub_active",
  plan_tier: "pro",
  subscription_status: "active",
  current_period_end: "2026-06-12T00:00:00.000Z",
  updated_at: "2026-05-12T12:00:00.000Z",
});

const canceledPayload = subscriptionProfilePayload({
  customerId: "cus_canceled",
  tier: "pro",
  status: "canceled",
  subscriptionId: "sub_canceled",
  currentPeriodEndIso: "2026-06-12T00:00:00.000Z",
  updatedAt: "2026-05-12T12:00:00.000Z",
});
assert.equal(canceledPayload.plan_tier, "free", "Webhook cancellation should downgrade backend-owned entitlement to Free");
assert.equal(canceledPayload.subscription_status, "canceled");

const userTargetSupabase = fakeSupabase();
await applySubscriptionProfileUpdate(userTargetSupabase, {
  customerId: "cus_user",
  userId: "supabase-user-1",
  tier: "pro",
  status: "trialing",
  subscriptionId: "sub_trial",
  currentPeriodEndIso: "2026-06-12T00:00:00.000Z",
  updatedAt: "2026-05-12T12:00:00.000Z",
});
assert.equal(userTargetSupabase.calls[0].table, "relay_profiles");
assert.equal(userTargetSupabase.calls[0].column, "id", "checkout webhook should update entitlement by Supabase user id when metadata exists");
assert.equal(userTargetSupabase.calls[0].value, "supabase-user-1");
assert.equal(userTargetSupabase.calls[0].payload.plan_tier, "pro");

const customerTargetSupabase = fakeSupabase();
await applySubscriptionProfileUpdate(customerTargetSupabase, {
  customerId: "cus_existing",
  tier: "pro",
  status: "canceled",
  subscriptionId: "sub_existing",
  currentPeriodEndIso: null,
  updatedAt: "2026-05-12T12:00:00.000Z",
});
assert.equal(customerTargetSupabase.calls[0].column, "stripe_customer_id", "subscription update without user metadata should target the Stripe customer");
assert.equal(customerTargetSupabase.calls[0].value, "cus_existing");
assert.equal(customerTargetSupabase.calls[0].payload.plan_tier, "free");

const maliciousPatch = profilePatchColumns({
  role: "teacher",
  noTrainingOnStudentData: false,
  plan_tier: "pro",
  subscription_status: "active",
  stripe_customer_id: "cus_attacker",
  billingProfile: { tier: "pro", status: "active" },
});
assert.deepEqual(
  maliciousPatch,
  { role: "teacher", no_training_on_student_data: false },
  "Profile PATCH must ignore client-submitted paid entitlement fields",
);

const profile = billingProfileFromRow({
  plan_tier: "pro",
  subscription_status: "active",
  stripe_customer_id: "cus_profile",
  current_period_end: "2026-06-12T00:00:00.000Z",
});
assert.deepEqual(profile, {
  tier: "pro",
  status: "active",
  customerId: "cus_profile",
  currentPeriodEnd: "2026-06-12T00:00:00.000Z",
});
