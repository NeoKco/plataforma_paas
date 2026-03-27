from fastapi import HTTPException


def raise_finance_schema_http_error(exc: Exception) -> None:
    detail = str(exc).lower()

    if (
        "no such table" in detail
        or "undefinedtable" in detail
        or "no existe la relación" in detail
        or "relation " in detail
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "El esquema finance del tenant está incompleto. Sincroniza el esquema "
                "tenant antes de usar esta vista."
            ),
        ) from exc

    raise exc
