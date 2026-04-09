from sqlalchemy.orm import Session

from app.apps.platform_control.models.tenant_data_transfer_artifact import (
    TenantDataTransferArtifact,
)


class TenantDataTransferArtifactRepository:
    def create(
        self,
        db: Session,
        *,
        job_id: int,
        artifact_type: str,
        file_name: str,
        stored_path: str,
        content_type: str,
        sha256_hex: str,
        size_bytes: int,
    ) -> TenantDataTransferArtifact:
        artifact = TenantDataTransferArtifact(
            job_id=job_id,
            artifact_type=artifact_type,
            file_name=file_name,
            stored_path=stored_path,
            content_type=content_type,
            sha256_hex=sha256_hex,
            size_bytes=size_bytes,
        )
        db.add(artifact)
        db.commit()
        db.refresh(artifact)
        return artifact
