from sqlalchemy import text

from app.common.db.control_database import control_engine


class PlatformRuntimeService:
    def get_control_database_name(self) -> str | None:
        with control_engine.connect() as conn:
            result = conn.execute(text("SELECT current_database()"))
            return result.scalar()
