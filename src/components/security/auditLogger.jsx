import { base44 } from "@/api/base44Client";

export async function auditLog({ action, resource_type, resource_id = "", details = "", status = "success" }) {
  try {
    const user = await base44.auth.me();
    await base44.entities.AuditLog.create({
      user_email: user?.email || "unknown",
      user_role: user?.role || "unknown",
      action,
      resource_type,
      resource_id: String(resource_id),
      details,
      status,
    });
  } catch {
    // Audit logging should never break the main flow
  }
}