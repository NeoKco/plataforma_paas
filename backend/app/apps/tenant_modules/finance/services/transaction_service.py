from pathlib import Path
from uuid import uuid4

from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models import (
    FinanceAccount,
    FinanceCurrency,
    FinanceTransaction,
    FinanceTransactionAttachment,
)
from app.apps.tenant_modules.finance.repositories import (
    FinanceAccountRepository,
    FinanceCurrencyRepository,
    FinanceTagRepository,
    FinanceTransactionAttachmentRepository,
    FinanceTransactionAuditRepository,
    FinanceTransactionRepository,
    FinanceTransactionTagRepository,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceTransactionCreateRequest,
    FinanceTransactionUpdateRequest,
)
from app.common.config.settings import settings
from app.common.policies.module_limit_catalog import (
    FINANCE_ENTRIES_LIMIT_KEY,
    FINANCE_ENTRIES_MONTHLY_LIMIT_KEY,
    FINANCE_ENTRIES_MONTHLY_TYPE_LIMIT_KEYS,
)


class FinanceUsageLimitExceededError(ValueError):
    pass


class FinanceService:
    MODULE_LIMIT_KEY = FINANCE_ENTRIES_LIMIT_KEY
    MONTHLY_MODULE_LIMIT_KEY = FINANCE_ENTRIES_MONTHLY_LIMIT_KEY
    MONTHLY_TYPE_MODULE_LIMIT_KEYS = FINANCE_ENTRIES_MONTHLY_TYPE_LIMIT_KEYS
    RECONCILIATION_REASON_CODES = {
        "operator_review",
        "bank_statement_match",
        "cash_closure",
        "loan_crosscheck",
        "migration_cleanup",
        "other",
    }
    ATTACHMENT_ALLOWED_CONTENT_TYPES = {
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
    }
    ATTACHMENT_MAX_SIZE_BYTES = 5 * 1024 * 1024

    def __init__(
        self,
        transaction_repository: FinanceTransactionRepository | None = None,
        entry_repository=None,
        currency_repository: FinanceCurrencyRepository | None = None,
        account_repository: FinanceAccountRepository | None = None,
        tag_repository: FinanceTagRepository | None = None,
        transaction_attachment_repository: FinanceTransactionAttachmentRepository | None = None,
        transaction_audit_repository: FinanceTransactionAuditRepository | None = None,
        transaction_tag_repository: FinanceTransactionTagRepository | None = None,
    ):
        # `entry_repository` se mantiene como alias legacy para no romper tests
        # ni puntos de integración que aún no migran a `transaction_repository`.
        self.transaction_repository = (
            transaction_repository or entry_repository or FinanceTransactionRepository()
        )
        self.currency_repository = currency_repository or FinanceCurrencyRepository()
        self.account_repository = account_repository or FinanceAccountRepository()
        self.tag_repository = tag_repository or FinanceTagRepository()
        self.transaction_attachment_repository = (
            transaction_attachment_repository or FinanceTransactionAttachmentRepository()
        )
        self.transaction_audit_repository = (
            transaction_audit_repository or FinanceTransactionAuditRepository()
        )
        self.transaction_tag_repository = (
            transaction_tag_repository or FinanceTransactionTagRepository()
        )

    def _enforce_usage_limits(
        self,
        tenant_db: Session,
        *,
        movement_type: str | None = None,
        max_entries: int | None = None,
        max_monthly_entries: int | None = None,
        max_monthly_entries_by_type: dict[str, int] | None = None,
    ) -> None:
        if max_entries is not None and max_entries > 0:
            current_entries = self.transaction_repository.count_all(tenant_db)
            if current_entries >= max_entries:
                raise FinanceUsageLimitExceededError(
                    "El plan actual alcanzo el limite de finance.entries"
                )

        if max_monthly_entries is not None and max_monthly_entries > 0:
            current_monthly_entries = self.transaction_repository.count_created_since(
                tenant_db,
                self._get_current_month_start(),
            )
            if current_monthly_entries >= max_monthly_entries:
                raise FinanceUsageLimitExceededError(
                    "El plan actual alcanzo el limite de finance.entries.monthly"
                )

        normalized_type = (movement_type or "").strip().lower()
        if (
            normalized_type
            and max_monthly_entries_by_type is not None
            and normalized_type in self.MONTHLY_TYPE_MODULE_LIMIT_KEYS
        ):
            type_monthly_limit = max_monthly_entries_by_type.get(normalized_type)
            if type_monthly_limit is not None and type_monthly_limit > 0:
                current_type_monthly_entries = (
                    self.transaction_repository.count_created_since_by_type(
                        tenant_db,
                        self._get_current_month_start(),
                        normalized_type,
                    )
                )
                if current_type_monthly_entries >= type_monthly_limit:
                    raise FinanceUsageLimitExceededError(
                        "El plan actual alcanzo el limite de "
                        f"{self.MONTHLY_TYPE_MODULE_LIMIT_KEYS[normalized_type]}"
                    )

    def create_entry(
        self,
        tenant_db: Session,
        movement_type: str,
        concept: str,
        amount: float,
        created_by_user_id: int | None,
        category: str | None = None,
        max_entries: int | None = None,
        max_monthly_entries: int | None = None,
        max_monthly_entries_by_type: dict[str, int] | None = None,
    ) -> FinanceTransaction:
        normalized_type = movement_type.strip().lower()
        if normalized_type not in {"income", "expense"}:
            raise ValueError("movement_type debe ser income o expense")

        if amount <= 0:
            raise ValueError("amount debe ser mayor que cero")

        self._enforce_usage_limits(
            tenant_db,
            movement_type=normalized_type,
            max_entries=max_entries,
            max_monthly_entries=max_monthly_entries,
            max_monthly_entries_by_type=max_monthly_entries_by_type,
        )

        base_currency = self._get_base_currency_or_raise(tenant_db)
        transaction = FinanceTransaction(
            transaction_type=normalized_type,
            account_id=None,
            target_account_id=None,
            category_id=None,
            beneficiary_id=None,
            person_id=None,
            project_id=None,
            currency_id=base_currency.id,
            loan_id=None,
            amount=amount,
            amount_in_base_currency=amount,
            exchange_rate=1,
            discount_amount=0,
            amortization_months=None,
            transaction_at=datetime.now(timezone.utc),
            alternative_date=None,
            description=concept,
            notes=category,
            is_favorite=False,
            favorite_flag=False,
            is_reconciled=False,
            reconciled_at=None,
            is_voided=False,
            voided_at=None,
            void_reason=None,
            voided_by_user_id=None,
            is_template_origin=False,
            planner_id=None,
            template_id=None,
            source_type="legacy_entries_api",
            source_id=None,
            created_by_user_id=created_by_user_id,
            updated_by_user_id=created_by_user_id,
        )
        saved = self.transaction_repository.save(tenant_db, transaction)
        self.transaction_audit_repository.save_event(
            tenant_db,
            transaction_id=saved.id,
            event_type="transaction.created.legacy_entry",
            actor_user_id=created_by_user_id,
            summary="Movimiento creado desde API legacy de entries",
            payload={"transaction_type": normalized_type, "concept": concept},
        )
        return saved

    def create_transaction(
        self,
        tenant_db: Session,
        payload: FinanceTransactionCreateRequest,
        *,
        created_by_user_id: int | None = None,
        source_type: str | None = None,
        source_id: int | None = None,
        event_type: str = "transaction.created",
        summary: str = "Transaccion financiera creada",
        audit_payload: dict | None = None,
        allow_accountless: bool = False,
        commit: bool = True,
        max_entries: int | None = None,
        max_monthly_entries: int | None = None,
        max_monthly_entries_by_type: dict[str, int] | None = None,
    ) -> FinanceTransaction:
        self._enforce_usage_limits(
            tenant_db,
            movement_type=payload.transaction_type,
            max_entries=max_entries,
            max_monthly_entries=max_monthly_entries,
            max_monthly_entries_by_type=max_monthly_entries_by_type,
        )

        transaction = self.stage_system_transaction(
            tenant_db,
            payload,
            actor_user_id=created_by_user_id,
            source_type=source_type,
            source_id=source_id,
            event_type=event_type,
            summary=summary,
            audit_payload=audit_payload,
            allow_accountless=allow_accountless,
        )
        if commit:
            tenant_db.commit()
            tenant_db.refresh(transaction)
            self._attach_tag_ids(tenant_db, [transaction])
        return transaction

    def stage_system_transaction(
        self,
        tenant_db: Session,
        payload: FinanceTransactionCreateRequest,
        *,
        actor_user_id: int | None = None,
        source_type: str | None = None,
        source_id: int | None = None,
        event_type: str = "transaction.created",
        summary: str = "Transaccion financiera creada",
        audit_payload: dict | None = None,
        allow_accountless: bool = False,
    ) -> FinanceTransaction:
        transaction_values = self._build_transaction_values(
            tenant_db,
            payload,
            current_transaction=None,
            allow_accountless=allow_accountless,
        )
        transaction = FinanceTransaction(
            **transaction_values,
            is_template_origin=False,
            planner_id=None,
            template_id=None,
            source_type=source_type,
            source_id=source_id,
            created_by_user_id=actor_user_id,
            updated_by_user_id=actor_user_id,
        )
        tenant_db.add(transaction)
        try:
            tenant_db.flush()
        except IntegrityError as exc:
            tenant_db.rollback()
            if not self.transaction_repository._is_primary_key_collision(exc):
                raise
            self.transaction_repository._repair_transaction_sequence(tenant_db)
            transaction.id = None
            tenant_db.add(transaction)
            tenant_db.flush()
        normalized_tag_ids = self._normalize_tag_ids(tenant_db, payload.tag_ids)
        self.transaction_tag_repository.replace_for_transaction(
            tenant_db,
            transaction.id,
            normalized_tag_ids,
        )
        tenant_db.add(
            self.transaction_audit_repository.build_event(
                transaction_id=transaction.id,
                event_type=event_type,
                actor_user_id=actor_user_id,
                summary=summary,
                payload={
                    "transaction_type": transaction_values["transaction_type"],
                    "account_id": transaction_values["account_id"],
                    "target_account_id": transaction_values["target_account_id"],
                    "currency_id": transaction_values["currency_id"],
                    "amount": transaction_values["amount"],
                    "tag_ids": normalized_tag_ids,
                    **(audit_payload or {}),
                },
            )
        )
        setattr(transaction, "tag_ids", normalized_tag_ids)
        return transaction

    def update_transaction(
        self,
        tenant_db: Session,
        transaction_id: int,
        payload: FinanceTransactionUpdateRequest,
        *,
        actor_user_id: int | None = None,
        actor_can_manage_all: bool = True,
        allow_accountless: bool = False,
        commit: bool = True,
    ) -> FinanceTransaction:
        transaction = self._get_transaction_for_actor(
            tenant_db,
            transaction_id,
            actor_user_id=actor_user_id,
            actor_can_manage_all=actor_can_manage_all,
        )
        self._raise_if_missing_or_voided(transaction)

        transaction_values = self._build_transaction_values(
            tenant_db,
            payload,
            current_transaction=transaction,
            allow_accountless=allow_accountless,
        )
        for field, value in transaction_values.items():
            setattr(transaction, field, value)
        normalized_tag_ids = self._normalize_tag_ids(tenant_db, payload.tag_ids)
        self.transaction_tag_repository.replace_for_transaction(
            tenant_db,
            transaction.id,
            normalized_tag_ids,
        )
        transaction.updated_by_user_id = actor_user_id
        if commit:
            saved = self.transaction_repository.persist(tenant_db, transaction)
            self.transaction_audit_repository.save_event(
                tenant_db,
                transaction_id=saved.id,
                event_type="transaction.updated",
                actor_user_id=actor_user_id,
                summary="Transaccion financiera actualizada",
                payload={
                    "transaction_type": transaction_values["transaction_type"],
                    "account_id": transaction_values["account_id"],
                    "target_account_id": transaction_values["target_account_id"],
                    "currency_id": transaction_values["currency_id"],
                    "amount": transaction_values["amount"],
                    "tag_ids": normalized_tag_ids,
                },
            )
            setattr(saved, "tag_ids", normalized_tag_ids)
            return saved

        tenant_db.add(transaction)
        tenant_db.flush()
        tenant_db.add(
            self.transaction_audit_repository.build_event(
                transaction_id=transaction.id,
                event_type="transaction.updated",
                actor_user_id=actor_user_id,
                summary="Transaccion financiera actualizada",
                payload={
                    "transaction_type": transaction_values["transaction_type"],
                    "account_id": transaction_values["account_id"],
                    "target_account_id": transaction_values["target_account_id"],
                    "currency_id": transaction_values["currency_id"],
                    "amount": transaction_values["amount"],
                    "tag_ids": normalized_tag_ids,
                },
            )
        )
        setattr(transaction, "tag_ids", normalized_tag_ids)
        return transaction

    def list_entries(self, tenant_db: Session) -> list[FinanceTransaction]:
        entries = self.transaction_repository.list_all(tenant_db)
        self._attach_tag_ids(tenant_db, entries)
        return entries

    def list_entries_for_viewer(
        self,
        tenant_db: Session,
        *,
        viewer_user_id: int | None = None,
        viewer_can_manage_all: bool = True,
    ) -> list[FinanceTransaction]:
        entries = (
            self.transaction_repository.list_all(tenant_db)
            if viewer_can_manage_all or viewer_user_id is None
            else self._list_entries_for_owner(
                tenant_db,
                owner_user_id=viewer_user_id,
            )
        )
        self._attach_tag_ids(tenant_db, entries)
        return entries

    def list_transactions(self, tenant_db: Session) -> list[FinanceTransaction]:
        transactions = self.transaction_repository.list_all(tenant_db)
        self._attach_tag_ids(tenant_db, transactions)
        return transactions

    def list_transactions_filtered(
        self,
        tenant_db: Session,
        *,
        viewer_user_id: int | None = None,
        viewer_can_manage_all: bool = True,
        transaction_type: str | None = None,
        account_id: int | None = None,
        category_id: int | None = None,
        tag_id: int | None = None,
        is_favorite: bool | None = None,
        is_reconciled: bool | None = None,
        search: str | None = None,
    ) -> list[FinanceTransaction]:
        transactions = self._list_filtered_for_viewer(
            tenant_db,
            owner_user_id=None if viewer_can_manage_all else viewer_user_id,
            transaction_type=transaction_type,
            account_id=account_id,
            category_id=category_id,
            tag_id=tag_id,
            is_favorite=is_favorite,
            is_reconciled=is_reconciled,
            search=search,
        )
        self._attach_tag_ids(tenant_db, transactions)
        return transactions

    def get_transaction_detail(
        self,
        tenant_db: Session,
        transaction_id: int,
        *,
        viewer_user_id: int | None = None,
        viewer_can_manage_all: bool = True,
    ) -> tuple[FinanceTransaction, list, list[FinanceTransactionAttachment]]:
        transaction = self._get_transaction_by_id(
            tenant_db,
            transaction_id,
            owner_user_id=None if viewer_can_manage_all else viewer_user_id,
        )
        if transaction is None:
            raise ValueError("La transaccion financiera no existe")

        audit_events = self.transaction_audit_repository.list_by_transaction(
            tenant_db,
            transaction_id=transaction_id,
        )
        attachments = self.transaction_attachment_repository.list_by_transaction(
            tenant_db,
            transaction_id=transaction_id,
        )
        self._attach_tag_ids(tenant_db, [transaction])
        return transaction, audit_events, attachments

    def create_transaction_attachment(
        self,
        tenant_db: Session,
        transaction_id: int,
        *,
        file_name: str,
        content_type: str | None,
        content_bytes: bytes,
        notes: str | None = None,
        actor_user_id: int | None = None,
        actor_can_manage_all: bool = True,
    ) -> FinanceTransactionAttachment:
        transaction = self._get_transaction_for_actor(
            tenant_db,
            transaction_id,
            actor_user_id=actor_user_id,
            actor_can_manage_all=actor_can_manage_all,
        )
        self._raise_if_missing_or_voided(transaction)

        normalized_file_name = self._normalize_attachment_file_name(file_name)
        normalized_content_type = (content_type or "").strip().lower() or None
        if normalized_content_type not in self.ATTACHMENT_ALLOWED_CONTENT_TYPES:
            raise ValueError("Tipo de archivo no soportado para adjuntos de finance")
        if not content_bytes:
            raise ValueError("El adjunto no puede estar vacio")
        if len(content_bytes) > self.ATTACHMENT_MAX_SIZE_BYTES:
            raise ValueError("El adjunto supera el tamaño máximo permitido de 5 MB")

        suffix = Path(normalized_file_name).suffix.lower() or self._content_type_to_suffix(
            normalized_content_type
        )
        storage_key = str(
            Path(f"transaction_{transaction_id}")
            / f"{uuid4().hex}{suffix}"
        )
        absolute_path = self._attachments_root() / storage_key
        absolute_path.parent.mkdir(parents=True, exist_ok=True)
        absolute_path.write_bytes(content_bytes)

        attachment = FinanceTransactionAttachment(
            transaction_id=transaction_id,
            file_name=normalized_file_name,
            storage_key=storage_key,
            content_type=normalized_content_type,
            file_size=len(content_bytes),
            notes=notes.strip() if notes and notes.strip() else None,
            uploaded_by_user_id=actor_user_id,
        )
        try:
            saved = self.transaction_attachment_repository.save(tenant_db, attachment)
        except Exception:
            if absolute_path.exists():
                absolute_path.unlink()
            raise

        self.transaction_audit_repository.save_event(
            tenant_db,
            transaction_id=transaction_id,
            event_type="transaction.attachment.created",
            actor_user_id=actor_user_id,
            summary="Adjunto agregado a la transaccion",
            payload={
                "attachment_id": saved.id,
                "file_name": saved.file_name,
                "content_type": saved.content_type,
                "file_size": saved.file_size,
            },
        )
        return saved

    def delete_transaction_attachment(
        self,
        tenant_db: Session,
        transaction_id: int,
        attachment_id: int,
        *,
        actor_user_id: int | None = None,
        actor_can_manage_all: bool = True,
    ) -> FinanceTransactionAttachment:
        transaction = self._get_transaction_for_actor(
            tenant_db,
            transaction_id,
            actor_user_id=actor_user_id,
            actor_can_manage_all=actor_can_manage_all,
        )
        if transaction is None:
            raise ValueError("La transaccion financiera no existe")

        attachment = self.transaction_attachment_repository.get_by_id(
            tenant_db,
            attachment_id,
        )
        if attachment is None or attachment.transaction_id != transaction_id:
            raise ValueError("El adjunto de la transaccion no existe")

        absolute_path = self._resolve_attachment_path(attachment.storage_key)
        self.transaction_attachment_repository.delete(tenant_db, attachment)
        if absolute_path.exists():
            absolute_path.unlink()

        self.transaction_audit_repository.save_event(
            tenant_db,
            transaction_id=transaction_id,
            event_type="transaction.attachment.deleted",
            actor_user_id=actor_user_id,
            summary="Adjunto eliminado de la transaccion",
            payload={
                "attachment_id": attachment.id,
                "file_name": attachment.file_name,
            },
        )
        return attachment

    def get_transaction_attachment(
        self,
        tenant_db: Session,
        transaction_id: int,
        attachment_id: int,
        *,
        viewer_user_id: int | None = None,
        viewer_can_manage_all: bool = True,
    ) -> tuple[FinanceTransactionAttachment, Path]:
        transaction = self._get_transaction_by_id(
            tenant_db,
            transaction_id,
            owner_user_id=None if viewer_can_manage_all else viewer_user_id,
        )
        self._raise_if_missing_or_voided(transaction)

        attachment = self.transaction_attachment_repository.get_by_id(
            tenant_db,
            attachment_id,
        )
        if attachment is None or attachment.transaction_id != transaction_id:
            raise ValueError("El adjunto de la transaccion no existe")

        absolute_path = self._resolve_attachment_path(attachment.storage_key)
        if not absolute_path.exists():
            raise ValueError("El archivo adjunto no está disponible en almacenamiento")
        return attachment, absolute_path

    def update_transaction_favorite(
        self,
        tenant_db: Session,
        transaction_id: int,
        *,
        is_favorite: bool,
        actor_user_id: int | None = None,
        actor_can_manage_all: bool = True,
    ) -> FinanceTransaction:
        transaction = self._get_transaction_for_actor(
            tenant_db,
            transaction_id,
            actor_user_id=actor_user_id,
            actor_can_manage_all=actor_can_manage_all,
        )
        self._raise_if_missing_or_voided(transaction)

        transaction.is_favorite = is_favorite
        transaction.favorite_flag = is_favorite
        transaction.updated_by_user_id = actor_user_id
        saved = self.transaction_repository.persist(tenant_db, transaction)
        self._attach_tag_ids(tenant_db, [saved])
        self.transaction_audit_repository.save_event(
            tenant_db,
            transaction_id=saved.id,
            event_type="transaction.favorite.updated",
            actor_user_id=actor_user_id,
            summary="Favorito de transaccion actualizado",
            payload={"is_favorite": is_favorite},
        )
        return saved

    def void_transaction(
        self,
        tenant_db: Session,
        transaction_id: int,
        *,
        reason: str | None = None,
        actor_user_id: int | None = None,
        actor_can_manage_all: bool = True,
    ) -> FinanceTransaction:
        transaction = self._get_transaction_for_actor(
            tenant_db,
            transaction_id,
            actor_user_id=actor_user_id,
            actor_can_manage_all=actor_can_manage_all,
        )
        self._raise_if_missing_or_voided(transaction)
        if transaction.source_type in {"loan_installment_payment", "loan_installment_reversal"}:
            raise ValueError(
                "Las transacciones derivadas de cuotas de préstamo deben revertirse desde Préstamos"
            )

        normalized_reason = reason.strip() if reason and reason.strip() else None
        transaction.is_voided = True
        transaction.voided_at = datetime.now(timezone.utc)
        transaction.void_reason = normalized_reason
        transaction.voided_by_user_id = actor_user_id
        transaction.is_favorite = False
        transaction.favorite_flag = False
        transaction.is_reconciled = False
        transaction.reconciled_at = None
        transaction.updated_by_user_id = actor_user_id
        saved = self.transaction_repository.persist(tenant_db, transaction)
        self._attach_tag_ids(tenant_db, [saved])
        self.transaction_audit_repository.save_event(
            tenant_db,
            transaction_id=saved.id,
            event_type="transaction.voided",
            actor_user_id=actor_user_id,
            summary="Transaccion financiera anulada",
            payload={"reason": normalized_reason},
        )
        return saved

    def update_transaction_reconciliation(
        self,
        tenant_db: Session,
        transaction_id: int,
        *,
        is_reconciled: bool,
        reason_code: str | None = None,
        note: str | None = None,
        actor_user_id: int | None = None,
        actor_can_manage_all: bool = True,
    ) -> FinanceTransaction:
        transaction = self._get_transaction_for_actor(
            tenant_db,
            transaction_id,
            actor_user_id=actor_user_id,
            actor_can_manage_all=actor_can_manage_all,
        )
        if transaction is None:
            raise ValueError("La transaccion financiera no existe")

        normalized_reason_code = self._normalize_reconciliation_reason_code(reason_code)
        transaction.is_reconciled = is_reconciled
        transaction.reconciled_at = datetime.now(timezone.utc) if is_reconciled else None
        transaction.updated_by_user_id = actor_user_id
        saved = self.transaction_repository.persist(tenant_db, transaction)
        self._attach_tag_ids(tenant_db, [saved])
        self.transaction_audit_repository.save_event(
            tenant_db,
            transaction_id=saved.id,
            event_type="transaction.reconciliation.updated",
            actor_user_id=actor_user_id,
            summary="Estado de conciliacion actualizado",
            payload={
                "is_reconciled": is_reconciled,
                "reason_code": normalized_reason_code,
                "note": note.strip() if note and note.strip() else None,
            },
        )
        return saved

    def update_transactions_favorite_batch(
        self,
        tenant_db: Session,
        transaction_ids: list[int],
        *,
        is_favorite: bool,
        actor_user_id: int | None = None,
        actor_can_manage_all: bool = True,
    ) -> list[FinanceTransaction]:
        transactions = self._get_transactions_for_batch(
            tenant_db,
            transaction_ids,
            owner_user_id=None if actor_can_manage_all else actor_user_id,
        )
        for transaction in transactions:
            transaction.is_favorite = is_favorite
            transaction.favorite_flag = is_favorite
            transaction.updated_by_user_id = actor_user_id
            self.transaction_audit_repository.save_event(
                tenant_db,
                transaction_id=transaction.id,
                event_type="transaction.favorite.updated.batch",
                actor_user_id=actor_user_id,
                summary="Favorito de transaccion actualizado en lote",
                payload={"is_favorite": is_favorite},
            )
        tenant_db.commit()
        for transaction in transactions:
            tenant_db.refresh(transaction)
        return transactions

    def update_transactions_reconciliation_batch(
        self,
        tenant_db: Session,
        transaction_ids: list[int],
        *,
        is_reconciled: bool,
        reason_code: str | None = None,
        note: str | None = None,
        actor_user_id: int | None = None,
        actor_can_manage_all: bool = True,
    ) -> list[FinanceTransaction]:
        transactions = self._get_transactions_for_batch(
            tenant_db,
            transaction_ids,
            owner_user_id=None if actor_can_manage_all else actor_user_id,
        )
        effective_reconciled_at = datetime.now(timezone.utc) if is_reconciled else None
        normalized_note = note.strip() if note and note.strip() else None
        normalized_reason_code = self._normalize_reconciliation_reason_code(reason_code)
        for transaction in transactions:
            transaction.is_reconciled = is_reconciled
            transaction.reconciled_at = effective_reconciled_at
            transaction.updated_by_user_id = actor_user_id
            self.transaction_audit_repository.save_event(
                tenant_db,
                transaction_id=transaction.id,
                event_type="transaction.reconciliation.updated.batch",
                actor_user_id=actor_user_id,
                summary="Estado de conciliacion actualizado en lote",
                payload={
                    "is_reconciled": is_reconciled,
                    "reason_code": normalized_reason_code,
                    "note": normalized_note,
                },
            )
        tenant_db.commit()
        for transaction in transactions:
            tenant_db.refresh(transaction)
        return transactions

    def _build_transaction_values(
        self,
        tenant_db: Session,
        payload: FinanceTransactionCreateRequest | FinanceTransactionUpdateRequest,
        *,
        current_transaction: FinanceTransaction | None,
        allow_accountless: bool = False,
    ) -> dict:
        normalized_type = payload.transaction_type.strip().lower()
        if normalized_type not in {"income", "expense", "transfer"}:
            raise ValueError("transaction_type debe ser income, expense o transfer")
        if payload.amount <= 0:
            raise ValueError("amount debe ser mayor que cero")
        if not payload.description.strip():
            raise ValueError("La descripcion de la transaccion es obligatoria")

        currency = self._get_currency_or_raise(tenant_db, payload.currency_id)
        source_account = self._get_account_if_present(tenant_db, payload.account_id)
        target_account = self._get_account_if_present(tenant_db, payload.target_account_id)

        if payload.account_id is None and not allow_accountless:
            raise ValueError("La transaccion requiere una cuenta origen")

        if normalized_type == "transfer":
            if payload.target_account_id is None:
                raise ValueError("La transferencia requiere cuenta destino")
            if payload.account_id == payload.target_account_id:
                raise ValueError("La transferencia requiere cuentas distintas")
        elif payload.target_account_id is not None:
            raise ValueError("Solo las transferencias pueden usar cuenta destino")

        if source_account and source_account.currency_id != currency.id:
            raise ValueError("La moneda de la transaccion debe coincidir con la cuenta origen")
        if target_account and target_account.currency_id != currency.id:
            raise ValueError("La moneda de la transaccion debe coincidir con la cuenta destino")

        amount_in_base_currency, exchange_rate = self._resolve_base_amounts(
            tenant_db,
            currency=currency,
            amount=payload.amount,
            exchange_rate=payload.exchange_rate,
        )
        reconciled_at = None
        if payload.is_reconciled:
            reconciled_at = (
                current_transaction.reconciled_at
                if current_transaction and current_transaction.reconciled_at
                else payload.transaction_at
            )

        return {
            "transaction_type": normalized_type,
            "account_id": payload.account_id,
            "target_account_id": payload.target_account_id,
            "category_id": payload.category_id,
            "beneficiary_id": payload.beneficiary_id,
            "person_id": payload.person_id,
            "project_id": payload.project_id,
            "currency_id": payload.currency_id,
            "loan_id": payload.loan_id,
            "amount": payload.amount,
            "amount_in_base_currency": amount_in_base_currency,
            "exchange_rate": exchange_rate,
            "discount_amount": payload.discount_amount,
            "amortization_months": payload.amortization_months,
            "transaction_at": payload.transaction_at,
            "alternative_date": payload.alternative_date,
            "description": payload.description.strip(),
            "notes": payload.notes.strip() if payload.notes and payload.notes.strip() else None,
            "is_favorite": payload.is_favorite,
            "favorite_flag": payload.is_favorite,
            "is_reconciled": payload.is_reconciled,
            "reconciled_at": reconciled_at,
            "is_voided": False if current_transaction is None else current_transaction.is_voided,
            "voided_at": None if current_transaction is None else current_transaction.voided_at,
            "void_reason": None if current_transaction is None else current_transaction.void_reason,
            "voided_by_user_id": (
                None if current_transaction is None else current_transaction.voided_by_user_id
            ),
        }

    def _normalize_tag_ids(
        self,
        tenant_db: Session,
        tag_ids: list[int] | None,
    ) -> list[int]:
        normalized_tag_ids = list(dict.fromkeys(tag_ids or []))
        for tag_id in normalized_tag_ids:
            if self.tag_repository.get_by_id(tenant_db, tag_id) is None:
                raise ValueError("Una o mas etiquetas financieras no existen")
        return normalized_tag_ids

    def _attach_tag_ids(
        self,
        tenant_db: Session,
        transactions: list[FinanceTransaction],
    ) -> None:
        if not transactions:
            return
        if not hasattr(tenant_db, "query"):
            for transaction in transactions:
                setattr(transaction, "tag_ids", list(getattr(transaction, "tag_ids", []) or []))
            return

        tag_ids_by_transaction_id = (
            self.transaction_tag_repository.list_tag_ids_by_transaction_ids(
                tenant_db,
                [transaction.id for transaction in transactions if transaction.id is not None],
            )
        )
        for transaction in transactions:
            setattr(
                transaction,
                "tag_ids",
                list(tag_ids_by_transaction_id.get(transaction.id, [])),
            )

    def _attachments_root(self) -> Path:
        root = Path(settings.FINANCE_ATTACHMENTS_DIR)
        root.mkdir(parents=True, exist_ok=True)
        return root

    def _legacy_attachments_root(self) -> Path:
        return (
            Path(settings.BASE_DIR)
            / "backend"
            / "app"
            / "apps"
            / "tenant_modules"
            / "finance"
            / "storage"
            / "attachments"
        )

    def _resolve_attachment_path(self, storage_key: str) -> Path:
        current_path = self._attachments_root() / storage_key
        if current_path.exists():
            return current_path
        legacy_path = self._legacy_attachments_root() / storage_key
        return legacy_path if legacy_path.exists() else current_path

    def _normalize_attachment_file_name(self, file_name: str) -> str:
        normalized = Path(file_name or "attachment").name.strip()
        return normalized or "attachment"

    def _content_type_to_suffix(self, content_type: str | None) -> str:
        if content_type == "image/jpeg":
            return ".jpg"
        if content_type == "image/png":
            return ".png"
        if content_type == "image/webp":
            return ".webp"
        if content_type == "application/pdf":
            return ".pdf"
        return ""

    def _normalize_reconciliation_reason_code(self, reason_code: str | None) -> str | None:
        if reason_code is None:
            return None
        normalized = reason_code.strip().lower()
        if not normalized:
            return None
        if normalized not in self.RECONCILIATION_REASON_CODES:
            raise ValueError("El motivo de conciliacion no es valido")
        return normalized

    def _raise_if_missing_or_voided(
        self,
        transaction: FinanceTransaction | None,
    ) -> None:
        if transaction is None:
            raise ValueError("La transaccion financiera no existe")
        if getattr(transaction, "is_voided", False):
            raise ValueError("La transaccion financiera ya fue anulada")

    def _get_transactions_for_batch(
        self,
        tenant_db: Session,
        transaction_ids: list[int],
        *,
        owner_user_id: int | None = None,
    ) -> list[FinanceTransaction]:
        normalized_ids = list(dict.fromkeys(transaction_ids))
        if not normalized_ids:
            raise ValueError("Debes indicar al menos una transaccion")
        transactions = self._list_transactions_by_ids(
            tenant_db,
            normalized_ids,
            owner_user_id=owner_user_id,
        )
        loaded_ids = {transaction.id for transaction in transactions}
        missing_ids = [transaction_id for transaction_id in normalized_ids if transaction_id not in loaded_ids]
        if missing_ids:
            raise ValueError("Una o mas transacciones financieras no existen")
        return transactions

    def get_summary(
        self,
        tenant_db: Session,
        *,
        viewer_user_id: int | None = None,
        viewer_can_manage_all: bool = True,
    ) -> dict[str, float | int]:
        entries = (
            self.transaction_repository.list_all(tenant_db)
            if viewer_can_manage_all or viewer_user_id is None
            else self._list_entries_for_owner(
                tenant_db,
                owner_user_id=viewer_user_id,
            )
        )
        total_income = sum(
            entry.amount
            for entry in entries
            if getattr(entry, "transaction_type", getattr(entry, "movement_type", None))
            == "income"
        )
        total_expense = sum(
            entry.amount
            for entry in entries
            if getattr(entry, "transaction_type", getattr(entry, "movement_type", None))
            == "expense"
        )
        net_result = total_income - total_expense
        total_account_balance = (
            self._get_visible_total_account_balance(tenant_db)
            if viewer_can_manage_all or viewer_user_id is None
            else 0.0
        )

        return {
            "total_income": total_income,
            "total_expense": total_expense,
            "balance": net_result,
            "net_result": net_result,
            "total_account_balance": total_account_balance,
            "total_entries": len(entries),
        }

    def get_usage(
        self,
        tenant_db: Session,
        *,
        viewer_user_id: int | None = None,
        viewer_can_manage_all: bool = True,
        max_entries: int | None = None,
    ) -> dict:
        used_entries = (
            self.transaction_repository.count_all(tenant_db)
            if viewer_can_manage_all or viewer_user_id is None
            else len(
                self._list_entries_for_owner(
                    tenant_db,
                    owner_user_id=viewer_user_id,
                )
            )
        )
        unlimited = max_entries is None or max_entries <= 0
        effective_max_entries = None if unlimited else max_entries
        remaining_entries = (
            None
            if effective_max_entries is None
            else max(effective_max_entries - used_entries, 0)
        )

        return {
            "module_key": self.MODULE_LIMIT_KEY,
            "used_entries": used_entries,
            "max_entries": effective_max_entries,
            "remaining_entries": remaining_entries,
            "unlimited": unlimited,
            "at_limit": False
            if effective_max_entries is None
            else used_entries >= effective_max_entries,
        }

    def _get_transaction_for_actor(
        self,
        tenant_db: Session,
        transaction_id: int,
        *,
        actor_user_id: int | None,
        actor_can_manage_all: bool,
    ) -> FinanceTransaction | None:
        return self._get_transaction_by_id(
            tenant_db,
            transaction_id,
            owner_user_id=None if actor_can_manage_all else actor_user_id,
        )

    def _get_transaction_by_id(
        self,
        tenant_db: Session,
        transaction_id: int,
        *,
        owner_user_id: int | None = None,
    ) -> FinanceTransaction | None:
        try:
            return self.transaction_repository.get_by_id(
                tenant_db,
                transaction_id,
                owner_user_id=owner_user_id,
            )
        except TypeError:
            return self.transaction_repository.get_by_id(tenant_db, transaction_id)

    def _list_entries_for_owner(
        self,
        tenant_db: Session,
        *,
        owner_user_id: int,
    ) -> list[FinanceTransaction]:
        try:
            return self.transaction_repository.list_all_for_owner(
                tenant_db,
                owner_user_id=owner_user_id,
            )
        except (AttributeError, TypeError):
            entries = self.transaction_repository.list_all(tenant_db)
            return [
                entry
                for entry in entries
                if getattr(entry, "created_by_user_id", owner_user_id) == owner_user_id
            ]

    def _list_filtered_for_viewer(
        self,
        tenant_db: Session,
        *,
        owner_user_id: int | None,
        transaction_type: str | None,
        account_id: int | None,
        category_id: int | None,
        tag_id: int | None,
        is_favorite: bool | None,
        is_reconciled: bool | None,
        search: str | None,
    ) -> list[FinanceTransaction]:
        try:
            return self.transaction_repository.list_filtered(
                tenant_db,
                owner_user_id=owner_user_id,
                transaction_type=transaction_type,
                account_id=account_id,
                category_id=category_id,
                tag_id=tag_id,
                is_favorite=is_favorite,
                is_reconciled=is_reconciled,
                search=search,
            )
        except TypeError:
            return self.transaction_repository.list_filtered(
                tenant_db,
                transaction_type=transaction_type,
                account_id=account_id,
                category_id=category_id,
                tag_id=tag_id,
                is_favorite=is_favorite,
                is_reconciled=is_reconciled,
                search=search,
            )

    def _list_transactions_by_ids(
        self,
        tenant_db: Session,
        transaction_ids: list[int],
        *,
        owner_user_id: int | None = None,
    ) -> list[FinanceTransaction]:
        try:
            return self.transaction_repository.list_by_ids(
                tenant_db,
                transaction_ids,
                owner_user_id=owner_user_id,
            )
        except TypeError:
            return self.transaction_repository.list_by_ids(tenant_db, transaction_ids)

    def get_monthly_usage(
        self,
        tenant_db: Session,
        *,
        max_entries: int | None = None,
    ) -> dict:
        used_entries = self.transaction_repository.count_created_since(
            tenant_db,
            self._get_current_month_start(),
        )
        unlimited = max_entries is None or max_entries <= 0
        effective_max_entries = None if unlimited else max_entries
        remaining_entries = (
            None
            if effective_max_entries is None
            else max(effective_max_entries - used_entries, 0)
        )

        return {
            "module_key": self.MONTHLY_MODULE_LIMIT_KEY,
            "used_entries": used_entries,
            "max_entries": effective_max_entries,
            "remaining_entries": remaining_entries,
            "unlimited": unlimited,
            "at_limit": False
            if effective_max_entries is None
            else used_entries >= effective_max_entries,
        }

    def get_monthly_usage_by_type(
        self,
        tenant_db: Session,
        *,
        movement_type: str,
        max_entries: int | None = None,
    ) -> dict:
        normalized_type = movement_type.strip().lower()
        module_key = self.MONTHLY_TYPE_MODULE_LIMIT_KEYS[normalized_type]
        used_entries = self.transaction_repository.count_created_since_by_type(
            tenant_db,
            self._get_current_month_start(),
            normalized_type,
        )
        unlimited = max_entries is None or max_entries <= 0
        effective_max_entries = None if unlimited else max_entries
        remaining_entries = (
            None
            if effective_max_entries is None
            else max(effective_max_entries - used_entries, 0)
        )

        return {
            "module_key": module_key,
            "used_entries": used_entries,
            "max_entries": effective_max_entries,
            "remaining_entries": remaining_entries,
            "unlimited": unlimited,
            "at_limit": False
            if effective_max_entries is None
            else used_entries >= effective_max_entries,
        }

    def get_account_balances(self, tenant_db: Session) -> dict[int, float]:
        accounts = self.account_repository.list_all(tenant_db, include_inactive=True)
        balances = {account.id: float(account.opening_balance or 0) for account in accounts}

        for transaction in self.transaction_repository.list_all(tenant_db):
            amount = float(transaction.amount)
            transaction_type = getattr(
                transaction,
                "transaction_type",
                getattr(transaction, "movement_type", None),
            )
            account_id = getattr(transaction, "account_id", None)
            target_account_id = getattr(transaction, "target_account_id", None)
            if transaction_type == "income" and account_id:
                balances[account_id] = balances.get(account_id, 0.0) + amount
            elif transaction_type == "expense" and account_id:
                balances[account_id] = balances.get(account_id, 0.0) - amount
            elif transaction_type == "transfer":
                if account_id:
                    balances[account_id] = balances.get(account_id, 0.0) - amount
                if target_account_id:
                    balances[target_account_id] = balances.get(target_account_id, 0.0) + amount

        return balances

    def _get_visible_total_account_balance(self, tenant_db: Session) -> float:
        accounts = self.account_repository.list_all(tenant_db, include_inactive=True)
        visible_accounts = [account for account in accounts if not account.is_balance_hidden]
        if not visible_accounts:
            return 0.0

        balances = self.get_account_balances(tenant_db)
        visible_currency_ids = {account.currency_id for account in visible_accounts}

        if len(visible_currency_ids) > 1:
            base_currency = self._get_base_currency_or_raise(tenant_db)
            return round(
                sum(
                    balances.get(account.id, 0.0)
                    for account in visible_accounts
                    if account.currency_id == base_currency.id
                ),
                2,
            )

        return round(
            sum(balances.get(account.id, 0.0) for account in visible_accounts),
            2,
        )

    def _get_current_month_start(self) -> datetime:
        now = datetime.now(timezone.utc)
        return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def _get_currency_or_raise(self, tenant_db: Session, currency_id: int) -> FinanceCurrency:
        currency = self.currency_repository.get_by_id(tenant_db, currency_id)
        if currency is None:
            raise ValueError("La moneda seleccionada no existe")
        return currency

    def _get_base_currency_or_raise(self, tenant_db: Session) -> FinanceCurrency:
        currencies = self.currency_repository.list_all(tenant_db, include_inactive=True)
        for currency in currencies:
            if currency.is_base:
                return currency
        if currencies:
            return currencies[0]
        raise ValueError("No existe una moneda base configurada para finance")

    def _get_account_if_present(
        self,
        tenant_db: Session,
        account_id: int | None,
    ) -> FinanceAccount | None:
        if account_id is None:
            return None
        account = self.account_repository.get_by_id(tenant_db, account_id)
        if account is None:
            raise ValueError("La cuenta financiera seleccionada no existe")
        return account

    def _resolve_base_amounts(
        self,
        tenant_db: Session,
        *,
        currency: FinanceCurrency,
        amount: float,
        exchange_rate: float | None,
    ) -> tuple[float, float | None]:
        base_currency = self._get_base_currency_or_raise(tenant_db)
        if currency.id == base_currency.id:
            return amount, exchange_rate or 1

        if exchange_rate is None or exchange_rate <= 0:
            raise ValueError(
                "Las transacciones en moneda no base requieren exchange_rate mayor que cero"
            )

        return amount * exchange_rate, exchange_rate
