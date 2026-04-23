from app.common.security.tenant_secret_service import TenantSecretService


class RuntimeSecurityService:
    def __init__(
        self,
        tenant_secret_service: TenantSecretService | None = None,
    ) -> None:
        self.tenant_secret_service = tenant_secret_service or TenantSecretService()

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

    def describe_security_posture(
        self,
        current_settings,
        *,
        tenant_slugs: list[str] | None = None,
    ) -> dict:
        findings = self.validate_settings(current_settings)
        secret_posture = self.tenant_secret_service.build_secret_posture(current_settings)
        runtime_secret = secret_posture["runtime"]
        legacy_secret = secret_posture["legacy"]
        runtime_isolated_from_legacy = (
            runtime_secret["path"] != legacy_secret["path"]
            and runtime_secret["classification"] != "legacy_env_file"
        )
        distribution_summary = self.tenant_secret_service.build_tenant_secret_distribution_summary(
            current_settings,
            tenant_slugs or [],
        )
        return {
            "findings": findings,
            "production_ready": len(findings) == 0,
            "tenant_secrets_runtime": runtime_secret,
            "tenant_secrets_legacy": legacy_secret,
            "tenant_secrets_isolated_from_legacy": runtime_isolated_from_legacy,
            "tenant_secret_distribution_summary": distribution_summary,
        }

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

        secret_posture = self.tenant_secret_service.build_secret_posture(current_settings)
        runtime_secret = secret_posture["runtime"]
        legacy_secret = secret_posture["legacy"]

        if runtime_secret["path"] == legacy_secret["path"]:
            findings.append(
                "TENANT_SECRETS_FILE sigue apuntando al .env legacy; separa los secretos tenant del .env principal"
            )

        if not runtime_secret["readable"]:
            findings.append("TENANT_SECRETS_FILE no es legible por el backend")

        if not runtime_secret["writable"]:
            findings.append("TENANT_SECRETS_FILE no es escribible por el backend")

        if (
            current_settings.APP_ENV.lower() == "production"
            and runtime_secret["path"] == legacy_secret["path"]
        ):
            findings.append(
                "production sigue mezclando secretos tenant con el .env principal"
            )

        if current_settings.APP_ENV.lower() == "production" and findings:
            raise RuntimeError(
                "Configuracion insegura para produccion: " + "; ".join(findings)
            )

        return findings
