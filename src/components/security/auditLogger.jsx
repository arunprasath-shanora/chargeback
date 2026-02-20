
import { base44 } from "@/api/base44Client";

export async function auditLog({
  action,
  resource_type,
  resource_id = "",
  details = "",
  status = "success",
  old_value = "",
  new_value = "",
  record_count = null,
  failure_reason = ""
}) {
  try {
    const user = await base44.auth.me();

    // Get IP address from client
    let ip_address = "unknown";
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      ip_address = data.ip;
    } catch (error) {
      // If fetching IP fails, it remains 'unknown'
      console.error("Failed to fetch IP address for audit log:", error);
      ip_address = "unknown";
    }

    const logData = {
      user_email: user?.email || "unknown",
      user_role: user?.role || "unknown",
      action,
      resource_type,
      resource_id: String(resource_id),
      details,
      ip_address,
      status,
    };

    // Add optional fields if provided
    if (old_value) logData.old_value = String(old_value);
    if (new_value) logData.new_value = String(new_value);
    if (record_count !== null) logData.record_count = record_count; // Use !== null to distinguish from 0
    if (failure_reason && status !== "success") logData.failure_reason = failure_reason;

    await base44.entities.AuditLog.create(logData);
  } catch (error) {
    // Audit logging should never break the main flow
    console.error("Error creating audit log entry:", error);
  }
}
