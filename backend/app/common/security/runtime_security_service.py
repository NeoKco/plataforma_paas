class RuntimeSecurityService:
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

        if current_settings.APP_ENV.lower() == "production" and findings:
            raise RuntimeError(
                "Configuracion insegura para produccion: " + "; ".join(findings)
            )

        return findings
