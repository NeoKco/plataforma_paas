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
        fake_settings = SimpleNamespace()

        with tempfile.TemporaryDirectory() as temp_dir:
            env_path = Path(temp_dir) / ".env"
            env_var = service.store_tenant_db_password(
                tenant_slug="empresa-bootstrap",
                password="SuperSecret123!",
                env_path=env_path,
            )

            resolved = service.resolve_tenant_db_password(
                "empresa-bootstrap",
                fake_settings,
            )

        self.assertEqual(env_var, "TENANT_DB_PASSWORD__EMPRESA_BOOTSTRAP")
        self.assertEqual(resolved, "SuperSecret123!")

    def test_mask_secret_keeps_last_characters_only(self) -> None:
        service = TenantSecretService()

        masked = service.mask_secret("SuperSecret123!", visible=4)

        self.assertTrue(masked.endswith("123!"))
        self.assertTrue(masked.startswith("*"))
