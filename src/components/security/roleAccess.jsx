// Role-based page access control
// PCI DSS Requirement 7: Restrict access to system components based on business need

export const ROLE_PAGES = {
  super_admin: ["Dashboard", "Disputes", "Inventory", "Projects", "MasterSetup", "Reports", "Users"],
  admin:       ["Dashboard", "Disputes", "Inventory", "Projects", "Reports", "Users"],
  manager:     ["Dashboard", "Disputes", "Inventory", "Users", "Reports"],
  analyst:     ["Dashboard", "Disputes"],
  user:        ["Dashboard", "Disputes"],
};

export function canAccessPage(role, page) {
  const allowed = ROLE_PAGES[role] || ROLE_PAGES["analyst"];
  return allowed.includes(page);
}

export function getAllowedPages(role) {
  return ROLE_PAGES[role] || ROLE_PAGES["analyst"];
}

// Password policy (PCI DSS Requirement 8.3 / ISMS ISO 27001 A.9.4)
export const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};

export function validatePassword(password) {
  const errors = [];
  if ((password || "").length < PASSWORD_POLICY.minLength)
    errors.push(`At least ${PASSWORD_POLICY.minLength} characters`);
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password))
    errors.push("At least one uppercase letter (A-Z)");
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password))
    errors.push("At least one lowercase letter (a-z)");
  if (PASSWORD_POLICY.requireNumber && !/[0-9]/.test(password))
    errors.push("At least one number (0-9)");
  if (PASSWORD_POLICY.requireSpecial && !/[@#$!%^&*()_+\-=\[\]{}|;':",./<>?]/.test(password))
    errors.push("At least one special character (@#$!...)");
  return errors;
}

export function generateCompliantPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const nums  = "23456789";
  const spec  = "@#$!%^&*";
  const all   = upper + lower + nums + spec;
  let pwd = "";
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += nums[Math.floor(Math.random() * nums.length)];
  pwd += nums[Math.floor(Math.random() * nums.length)];
  pwd += spec[Math.floor(Math.random() * spec.length)];
  pwd += spec[Math.floor(Math.random() * spec.length)];
  for (let i = 0; i < 6; i++) pwd += all[Math.floor(Math.random() * all.length)];
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

// Mask card data for display — PCI DSS Req 3: protect stored cardholder data
export function maskCardLast4(last4) {
  if (!last4) return "——";
  return `•••• ${last4}`;
}

export function maskCardFull(last4) {
  if (!last4) return "——";
  return `•••• •••• •••• ${last4}`;
}