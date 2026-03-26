from app.common.auth.dependencies import require_tenant_permission


require_finance_read = require_tenant_permission("tenant.finance.read")
require_finance_create = require_tenant_permission("tenant.finance.create")
