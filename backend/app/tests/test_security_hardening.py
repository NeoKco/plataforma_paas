import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from fastapi import HTTPException

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.common.security.runtime_security_service import (  # noqa: E402
    RuntimeSecurityService,
)
from app.common.auth.jwt_service import JWTService, create_access_token  # noqa: E402
from app.common.config.settings import settings  # noqa: E402
from app.common.security.ai_runtime_secret_service import AIRuntimeSecretService  # noqa: E402
from app.common.security.tenant_secret_service import TenantSecretService  # noqa: E402


class SettingsParsingTestCase(unittest.TestCase):
    def test_debug_accepts_release_alias_as_false(self) -> None:
        from app.common.config.settings import Settings

        parsed = Settings.model_validate({"DEBUG": "release"})

        self.assertFalse(parsed.DEBUG)

    def test_debug_accepts_development_alias_as_true(self) -> None:
        from app.common.config.settings import Settings

        parsed = Settings.model_validate({"DEBUG": "development"})

        self.assertTrue(parsed.DEBUG)


class RuntimeSecurityServiceTestCase(unittest.TestCase):
    def test_validate_settings_raises_insecure_defaults_in_production(self) -> None:
        service = RuntimeSecurityService()
        fake_settings = SimpleNamespace(
            APP_ENV="production",
            JWT_SECRET_KEY="change_this_secret_in_production",
            CONTROL_DB_PASSWORD="change_me",
            POSTGRES_ADMIN_PASSWORD="",
            JWT_ISSUER="",
            JWT_PLATFORM_AUDIENCE="",
            JWT_TENANT_AUDIENCE="",
            TENANT_BOOTSTRAP_DB_PASSWORD_EMPRESA_BOOTSTRAP="123456789",
            TENANT_BOOTSTRAP_DB_PASSWORD_CONDOMINIO_DEMO="123456789",
        )

        with self.assertRaises(RuntimeError):
            service.validate_settings(fake_settings)

    def test_validate_settings_returns_findings_in_non_production(self) -> None:
        service = RuntimeSecurityService()
        fake_settings = SimpleNamespace(
            APP_ENV="development",
            BASE_DIR=Path("/tmp/platform-paas"),
            TENANT_SECRETS_FILE="/tmp/platform-paas/.tenant-secrets.env",
            JWT_SECRET_KEY="change_this_secret_in_production",
            CONTROL_DB_PASSWORD="change_me",
            POSTGRES_ADMIN_PASSWORD="",
            JWT_ISSUER="",
            JWT_PLATFORM_AUDIENCE="",
            JWT_TENANT_AUDIENCE="",
            TENANT_BOOTSTRAP_DB_PASSWORD_EMPRESA_BOOTSTRAP="123456789",
            TENANT_BOOTSTRAP_DB_PASSWORD_CONDOMINIO_DEMO="shortsecret",
        )

        findings = service.validate_settings(fake_settings)

        self.assertGreaterEqual(len(findings), 7)
        self.assertTrue(any("JWT_ISSUER" in finding for finding in findings))
        self.assertTrue(
            any("TENANT_BOOTSTRAP_DB_PASSWORD_EMPRESA_BOOTSTRAP" in finding for finding in findings)
        )
        self.assertTrue(
            any("TENANT_BOOTSTRAP_DB_PASSWORD_CONDOMINIO_DEMO" in finding for finding in findings)
        )

    def test_validate_settings_flags_runtime_secrets_file_mixed_with_legacy_env(self) -> None:
        service = RuntimeSecurityService()

        with tempfile.TemporaryDirectory() as temp_dir:
            base_dir = Path(temp_dir)
            fake_settings = SimpleNamespace(
                APP_ENV="development",
                BASE_DIR=base_dir,
                TENANT_SECRETS_FILE=str(base_dir / ".env"),
                JWT_SECRET_KEY="safe-jwt-secret-123456",
                CONTROL_DB_PASSWORD="safe-control-password-123456",
                POSTGRES_ADMIN_PASSWORD="safe-postgres-password-123456",
                JWT_ISSUER="platform_paas",
                JWT_PLATFORM_AUDIENCE="platform-api",
                JWT_TENANT_AUDIENCE="tenant-api",
                TENANT_BOOTSTRAP_DB_PASSWORD_EMPRESA_BOOTSTRAP="",
                TENANT_BOOTSTRAP_DB_PASSWORD_CONDOMINIO_DEMO="",
            )

            findings = service.validate_settings(fake_settings)

        self.assertTrue(
            any("TENANT_SECRETS_FILE sigue apuntando al .env legacy" in finding for finding in findings)
        )

    def test_describe_security_posture_reports_secret_file_isolation(self) -> None:
        service = RuntimeSecurityService()

        with tempfile.TemporaryDirectory() as temp_dir:
            base_dir = Path(temp_dir)
            runtime_path = base_dir / ".tenant-secrets.env"
            runtime_path.write_text("", encoding="utf-8")
            fake_settings = SimpleNamespace(
                APP_ENV="development",
                BASE_DIR=base_dir,
                TENANT_SECRETS_FILE=str(runtime_path),
                JWT_SECRET_KEY="safe-jwt-secret-123456",
                CONTROL_DB_PASSWORD="safe-control-password-123456",
                POSTGRES_ADMIN_PASSWORD="safe-postgres-password-123456",
                JWT_ISSUER="platform_paas",
                JWT_PLATFORM_AUDIENCE="platform-api",
                JWT_TENANT_AUDIENCE="tenant-api",
                TENANT_BOOTSTRAP_DB_PASSWORD_EMPRESA_BOOTSTRAP="",
                TENANT_BOOTSTRAP_DB_PASSWORD_CONDOMINIO_DEMO="",
            )

            posture = service.describe_security_posture(fake_settings)

        self.assertTrue(posture["tenant_secrets_isolated_from_legacy"])
        self.assertEqual(
            posture["tenant_secrets_runtime"]["classification"],
            "runtime_secrets_file",
        )
        self.assertEqual(
            posture["tenant_secret_distribution_summary"]["audited_tenants"],
            0,
        )

    def test_describe_security_posture_summarizes_runtime_secret_distribution(self) -> None:
        service = RuntimeSecurityService()

        with tempfile.TemporaryDirectory() as temp_dir:
            base_dir = Path(temp_dir)
            runtime_path = base_dir / ".tenant-secrets.env"
            legacy_path = base_dir / ".env"
            runtime_path.write_text(
                "TENANT_DB_PASSWORD__CONDOMINIO_DEMO=runtime-secret\n",
                encoding="utf-8",
            )
            legacy_path.write_text(
                "TENANT_DB_PASSWORD__EMPRESA_BOOTSTRAP=legacy-secret\n",
                encoding="utf-8",
            )
            fake_settings = SimpleNamespace(
                APP_ENV="development",
                BASE_DIR=base_dir,
                TENANT_SECRETS_FILE=str(runtime_path),
                JWT_SECRET_KEY="safe-jwt-secret-123456",
                CONTROL_DB_PASSWORD="safe-control-password-123456",
                POSTGRES_ADMIN_PASSWORD="safe-postgres-password-123456",
                JWT_ISSUER="platform_paas",
                JWT_PLATFORM_AUDIENCE="platform-api",
                JWT_TENANT_AUDIENCE="tenant-api",
                TENANT_BOOTSTRAP_DB_PASSWORD_EMPRESA_BOOTSTRAP="",
                TENANT_BOOTSTRAP_DB_PASSWORD_CONDOMINIO_DEMO="",
            )

            posture = service.describe_security_posture(
                fake_settings,
                tenant_slugs=["condominio-demo", "empresa-bootstrap"],
            )

        summary = posture["tenant_secret_distribution_summary"]
        self.assertEqual(summary["audited_tenants"], 2)
        self.assertEqual(summary["runtime_ready_tenants"], 1)
        self.assertEqual(summary["missing_runtime_secret_tenants"], 1)
        self.assertEqual(summary["legacy_rescue_available_tenants"], 1)
        self.assertEqual(summary["missing_runtime_secret_slugs"], ["empresa-bootstrap"])
        self.assertEqual(summary["legacy_rescue_available_slugs"], ["empresa-bootstrap"])


class AIRuntimeSecretServiceTestCase(unittest.TestCase):
    def test_store_and_resolve_runtime_ai_config(self) -> None:
        service = AIRuntimeSecretService()

        with tempfile.TemporaryDirectory() as temp_dir:
            base_dir = Path(temp_dir)
            fake_settings = SimpleNamespace(
                APP_ENV="development",
                BASE_DIR=base_dir,
                AI_RUNTIME_SECRETS_FILE=str(base_dir / ".runtime-ai-secrets.env"),
                API_IA_URL="http://legacy.local:11435",
                MANAGER_API_IA_KEY="legacy-key",
                API_IA_MODEL_ID="legacy-model",
                API_IA_MAX_TOKENS=1000,
                API_IA_TEMPERATURE=0.2,
                API_IA_TIMEOUT=60,
            )

            saved = service.store_config(
                fake_settings,
                SimpleNamespace(
                    api_url="http://runtime.local:11435",
                    api_key="runtime-key-1234",
                    replace_api_key=True,
                    model_id="mistral-runtime",
                    max_tokens=1400,
                    temperature=0.3,
                    timeout=300,
                ),
            )
            resolved = service.resolve_config(fake_settings)

        self.assertEqual(saved["source"], "runtime_ai_secrets_file")
        self.assertTrue(saved["api_key_configured"])
        self.assertEqual(resolved["api_url"], "http://runtime.local:11435")
        self.assertEqual(resolved["api_key"], "runtime-key-1234")
        self.assertEqual(resolved["model_id"], "mistral-runtime")
        self.assertEqual(resolved["max_tokens"], 1400)
        self.assertEqual(resolved["temperature"], 0.3)
        self.assertEqual(resolved["timeout"], 300)

    def test_build_public_config_masks_api_key(self) -> None:
        service = AIRuntimeSecretService()

        with tempfile.TemporaryDirectory() as temp_dir:
            base_dir = Path(temp_dir)
            runtime_path = base_dir / ".runtime-ai-secrets.env"
            runtime_path.write_text(
                "\n".join(
                    [
                        "API_IA_URL=http://runtime.local:11435",
                        "MANAGER_API_IA_KEY=runtime-key-1234",
                        "API_IA_MODEL_ID=mistral-runtime",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )
            fake_settings = SimpleNamespace(
                APP_ENV="development",
                BASE_DIR=base_dir,
                AI_RUNTIME_SECRETS_FILE=str(runtime_path),
                API_IA_URL="",
                MANAGER_API_IA_KEY="",
                API_IA_MODEL_ID="",
                API_IA_MAX_TOKENS=1200,
                API_IA_TEMPERATURE=0.1,
                API_IA_TIMEOUT=45,
            )

            public_config = service.build_public_config(fake_settings)

        self.assertEqual(public_config["source"], "runtime_ai_secrets_file")
        self.assertTrue(public_config["api_key_configured"])
        self.assertEqual(public_config["api_key_masked"], "************1234")

    def test_validate_connection_uses_runtime_payload(self) -> None:
        service = AIRuntimeSecretService()

        with tempfile.TemporaryDirectory() as temp_dir:
            base_dir = Path(temp_dir)
            fake_settings = SimpleNamespace(
                APP_ENV="development",
                BASE_DIR=base_dir,
                AI_RUNTIME_SECRETS_FILE=str(base_dir / ".runtime-ai-secrets.env"),
                API_IA_URL="",
                MANAGER_API_IA_KEY="",
                API_IA_MODEL_ID="",
                API_IA_MAX_TOKENS=1200,
                API_IA_TEMPERATURE=0.1,
                API_IA_TIMEOUT=45,
            )

            class FakeResponse:
                ok = True

                def __init__(self) -> None:
                    self.text = '{"response":"ok"}'
                    self.headers = {"Content-Type": "application/json"}

                def json(self):
                    return {"response": '{"status":"ok"}'}

            post_mock = unittest.mock.Mock(return_value=FakeResponse())
            with unittest.mock.patch.dict(
                "sys.modules",
                {"requests": SimpleNamespace(post=post_mock)},
            ):
                result = service.validate_connection(
                    fake_settings,
                    SimpleNamespace(
                        api_url="http://runtime.local:11435",
                        api_key="runtime-key-1234",
                        replace_api_key=True,
                        model_id="mistral-runtime",
                        max_tokens=1400,
                        temperature=0.2,
                        timeout=300,
                    ),
                )

        self.assertTrue(result["reachable"])
        self.assertEqual(result["model_id"], "mistral-runtime")
        post_mock.assert_called_once()


class JWTSecurityServiceTestCase(unittest.TestCase):
    def test_create_access_token_adds_security_claims(self) -> None:
        token = create_access_token(
            data={
                "sub": "1",
                "email": "admin@platform.local",
                "role": "superadmin",
                "token_scope": "platform",
            },
            audience=settings.JWT_PLATFORM_AUDIENCE,
        )
        service = JWTService(
            secret_key=settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
            expire_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            issuer=settings.JWT_ISSUER,
        )

        payload = service.decode_token(
            token,
            audience=settings.JWT_PLATFORM_AUDIENCE,
        )

        self.assertEqual(payload["iss"], settings.JWT_ISSUER)
        self.assertEqual(payload["aud"], settings.JWT_PLATFORM_AUDIENCE)
        self.assertEqual(payload["token_type"], "access")
        self.assertIn("jti", payload)

    def test_decode_token_rejects_wrong_audience(self) -> None:
        token = create_access_token(
            data={
                "sub": "1",
                "email": "admin@platform.local",
                "role": "superadmin",
                "token_scope": "platform",
            },
            audience=settings.JWT_PLATFORM_AUDIENCE,
        )
        service = JWTService(
            secret_key=settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
            expire_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            issuer=settings.JWT_ISSUER,
        )

        with self.assertRaises(HTTPException) as exc:
            service.decode_token(
                token,
                audience=settings.JWT_TENANT_AUDIENCE,
            )

        self.assertEqual(exc.exception.status_code, 401)


class TenantSecretServiceTestCase(unittest.TestCase):
    def test_store_and_resolve_tenant_db_password(self) -> None:
        service = TenantSecretService()

        with tempfile.TemporaryDirectory() as temp_dir:
            secrets_path = Path(temp_dir) / ".tenant-secrets.env"
            fake_settings = SimpleNamespace(
                BASE_DIR=Path(temp_dir),
                TENANT_SECRETS_FILE=str(secrets_path),
            )
            env_var = service.store_tenant_db_password(
                tenant_slug="empresa-bootstrap",
                password="SuperSecret123!",
                env_path=secrets_path,
            )

            resolved = service.resolve_tenant_db_password(
                "empresa-bootstrap",
                fake_settings,
            )

        self.assertEqual(env_var, "TENANT_DB_PASSWORD__EMPRESA_BOOTSTRAP")
        self.assertEqual(resolved, "SuperSecret123!")

    def test_resolve_tenant_db_password_prefers_runtime_env_file_over_stale_process_env(self) -> None:
        service = TenantSecretService()
        env_var = "TENANT_DB_PASSWORD__EMPRESA_DEMO"
        previous_value = os.environ.get(env_var)
        os.environ[env_var] = "stale-process-secret"

        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                runtime_path = Path(temp_dir) / ".tenant-secrets.env"
                runtime_path.write_text(
                    "TENANT_DB_PASSWORD__EMPRESA_DEMO=fresh-file-secret\n",
                    encoding="utf-8",
                )

                resolved = service.resolve_tenant_db_password(
                    "empresa-demo",
                    SimpleNamespace(
                        BASE_DIR=Path(temp_dir),
                        TENANT_SECRETS_FILE=str(runtime_path),
                    ),
                )
        finally:
            if previous_value is None:
                os.environ.pop(env_var, None)
            else:
                os.environ[env_var] = previous_value

        self.assertEqual(resolved, "fresh-file-secret")

    def test_resolve_tenant_db_password_does_not_use_legacy_env_in_normal_runtime_mode(self) -> None:
        service = TenantSecretService()
        env_var = "TENANT_DB_PASSWORD__EMPRESA_DEMO"
        bootstrap_var = "TENANT_BOOTSTRAP_DB_PASSWORD_EMPRESA_DEMO"
        previous_runtime_value = os.environ.get(env_var)
        previous_bootstrap_value = os.environ.get(bootstrap_var)
        os.environ.pop(env_var, None)
        os.environ.pop(bootstrap_var, None)

        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                base_dir = Path(temp_dir)
                runtime_path = base_dir / ".tenant-secrets.env"
                legacy_path = base_dir / ".env"
                legacy_path.write_text(
                    "TENANT_DB_PASSWORD__EMPRESA_DEMO=legacy-secret\n",
                    encoding="utf-8",
                )
                runtime_path.write_text("", encoding="utf-8")

                with self.assertRaises(ValueError):
                    service.resolve_tenant_db_password(
                        "empresa-demo",
                        SimpleNamespace(
                            BASE_DIR=base_dir,
                            TENANT_SECRETS_FILE=str(runtime_path),
                        ),
                    )
        finally:
            if previous_runtime_value is None:
                os.environ.pop(env_var, None)
            else:
                os.environ[env_var] = previous_runtime_value
            if previous_bootstrap_value is None:
                os.environ.pop(bootstrap_var, None)
            else:
                os.environ[bootstrap_var] = previous_bootstrap_value

    def test_resolve_tenant_db_password_prefers_runtime_secret_file_over_legacy_env(self) -> None:
        service = TenantSecretService()

        with tempfile.TemporaryDirectory() as temp_dir:
            base_dir = Path(temp_dir)
            runtime_path = base_dir / ".tenant-secrets.env"
            legacy_path = base_dir / ".env"
            legacy_path.write_text(
                "TENANT_DB_PASSWORD__EMPRESA_DEMO=legacy-secret\n",
                encoding="utf-8",
            )
            runtime_path.write_text(
                "TENANT_DB_PASSWORD__EMPRESA_DEMO=runtime-secret\n",
                encoding="utf-8",
            )

            resolved = service.resolve_tenant_db_password(
                "empresa-demo",
                SimpleNamespace(
                    BASE_DIR=base_dir,
                    TENANT_SECRETS_FILE=str(runtime_path),
                ),
            )

        self.assertEqual(resolved, "runtime-secret")

    def test_resolve_tenant_db_password_allows_explicit_legacy_env_rescue(self) -> None:
        service = TenantSecretService()

        with tempfile.TemporaryDirectory() as temp_dir:
            base_dir = Path(temp_dir)
            runtime_path = base_dir / ".tenant-secrets.env"
            legacy_path = base_dir / ".env"
            legacy_path.write_text(
                "TENANT_DB_PASSWORD__EMPRESA_DEMO=legacy-secret\n",
                encoding="utf-8",
            )
            runtime_path.write_text("", encoding="utf-8")

            resolved = service.resolve_tenant_db_password(
                "empresa-demo",
                SimpleNamespace(
                    BASE_DIR=base_dir,
                    TENANT_SECRETS_FILE=str(runtime_path),
                ),
                allow_legacy_env_fallback=True,
            )

        self.assertEqual(resolved, "legacy-secret")

    def test_resolve_tenant_db_password_details_reports_source(self) -> None:
        service = TenantSecretService()

        with tempfile.TemporaryDirectory() as temp_dir:
            base_dir = Path(temp_dir)
            runtime_path = base_dir / ".tenant-secrets.env"
            runtime_path.write_text(
                "TENANT_DB_PASSWORD__EMPRESA_DEMO=runtime-secret\n",
                encoding="utf-8",
            )

            resolved = service.resolve_tenant_db_password_details(
                "empresa-demo",
                SimpleNamespace(
                    BASE_DIR=base_dir,
                    TENANT_SECRETS_FILE=str(runtime_path),
                ),
            )

        self.assertEqual(resolved["password"], "runtime-secret")
        self.assertEqual(resolved["env_var_name"], "TENANT_DB_PASSWORD__EMPRESA_DEMO")
        self.assertEqual(resolved["source"], "runtime_secrets_file")

    def test_describe_tenant_db_secret_distribution_detects_legacy_rescue(self) -> None:
        service = TenantSecretService()

        with tempfile.TemporaryDirectory() as temp_dir:
            base_dir = Path(temp_dir)
            runtime_path = base_dir / ".tenant-secrets.env"
            legacy_path = base_dir / ".env"
            runtime_path.write_text("", encoding="utf-8")
            legacy_path.write_text(
                "TENANT_DB_PASSWORD__EMPRESA_DEMO=legacy-secret\n",
                encoding="utf-8",
            )

            distribution = service.describe_tenant_db_secret_distribution(
                "empresa-demo",
                SimpleNamespace(
                    BASE_DIR=base_dir,
                    TENANT_SECRETS_FILE=str(runtime_path),
                ),
            )

        self.assertFalse(distribution["runtime_secret_present"])
        self.assertTrue(distribution["legacy_secret_present"])
        self.assertTrue(distribution["legacy_rescue_available"])

    def test_mask_secret_keeps_last_characters_only(self) -> None:
        service = TenantSecretService()

        masked = service.mask_secret("SuperSecret123!", visible=4)

        self.assertTrue(masked.endswith("123!"))
        self.assertTrue(masked.startswith("*"))
