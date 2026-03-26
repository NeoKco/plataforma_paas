class RuntimeSecurityService:
    def _collect_tenant_bootstrap_password_findings(self, current_settings) -> list[str]:
        findings: list[str] = []
        insecure_defaults = {
            "123456789",
            "12345678",
            "password",
            "changeme",
            "change_me",
        }

        for attr_name in dir(current_settings):
            if not attr_name.startswith("TENANT_BOOTSTRAP_DB_PASSWORD_"):
                continue

            value = getattr(current_settings, attr_name, "")
            if not isinstance(value, str) or not value.strip():
                continue

            normalized = value.strip().lower()
            if normalized in insecure_defaults:
                findings.append(
                    f"{attr_name} sigue con una password bootstrap insegura de demo"
                )
                continue

            if len(value.strip()) < 16:
                findings.append(
                    f"{attr_name} usa una password bootstrap demasiado corta "
                    "(minimo recomendado: 16 caracteres)"
                )

        return findings

    def validate_settings(self, current_settings) -> list[str]:
        findings: list[str] = []

        if current_settings.JWT_SECRET_KEY == "change_this_secret_in_production":
            findings.append("JWT_SECRET_KEY sigue con un valor inseguro por defecto")

        if current_settings.CONTROL_DB_PASSWORD == "change_me":
            findings.append("CONTROL_DB_PASSWORD sigue con un valor inseguro por defecto")

        if not current_settings.POSTGRES_ADMIN_PASSWORD:
            findings.append("POSTGRES_ADMIN_PASSWORD no esta configurado")

        if not getattr(current_settings, "JWT_ISSUER", "").strip():
            findings.append("JWT_ISSUER no esta configurado")

        if not getattr(current_settings, "JWT_PLATFORM_AUDIENCE", "").strip():
            findings.append("JWT_PLATFORM_AUDIENCE no esta configurado")

        if not getattr(current_settings, "JWT_TENANT_AUDIENCE", "").strip():
            findings.append("JWT_TENANT_AUDIENCE no esta configurado")

        findings.extend(self._collect_tenant_bootstrap_password_findings(current_settings))

        if current_settings.APP_ENV.lower() == "production" and findings:
            raise RuntimeError(
                "Configuracion insegura para produccion: " + "; ".join(findings)
            )

        return findings
