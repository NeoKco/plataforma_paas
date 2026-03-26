from sqlalchemy.engine import URL


def build_postgres_url(
    *,
    host: str,
    port: int,
    database: str,
    username: str,
    password: str,
) -> URL:
    return URL.create(
        drivername="postgresql+psycopg2",
        username=username,
        password=password,
        host=host,
        port=port,
        database=database,
    )
