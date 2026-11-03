"""Alembic env — wired to app settings so migrations use DATABASE_URL."""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, inspect, pool, text

from app.config import settings
from app.db import Base
from app import models  # noqa: F401  (register models on metadata)

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)
if config.config_file_name:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# The Round 2 head. A database built by the dev server's
# Base.metadata.create_all() has all the Round 2 tables but no alembic_version
# row, so `alembic upgrade head` would try to re-create existing tables and
# fail. Bootstrapping the version table at the Round 2 head lets the Round 3
# migration apply cleanly to that database while leaving its rows untouched.
ROUND2_HEAD = "36241343479d"


def _bootstrap_version_table(connection) -> None:
    """Stamp a create_all()-built database at the Round 2 head.

    Three cases:
      - no `submissions` table      -> truly fresh, let every migration run
      - version row already present -> already managed, do nothing
      - tables exist, no version row -> Round 2 schema, stamp it so only the
        Round 3 migration runs (existing rows are never touched)

    The "table exists but is empty" case matters: a previous failed `upgrade`
    leaves an empty `alembic_version` behind, and treating that as "managed"
    would make every retry start from scratch and collide with existing tables.
    """
    insp = inspect(connection)
    tables = set(insp.get_table_names())

    if "submissions" not in tables:
        return  # fresh database

    if "alembic_version" in tables:
        row = connection.execute(text("SELECT version_num FROM alembic_version")).first()
        if row is not None:
            return  # already versioned
    else:
        connection.execute(
            text(
                "CREATE TABLE alembic_version ("
                "version_num VARCHAR(32) NOT NULL, "
                "CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num))"
            )
        )

    connection.execute(
        text("INSERT INTO alembic_version (version_num) VALUES (:v)"),
        {"v": ROUND2_HEAD},
    )
    connection.commit()


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    section = config.get_section(config.config_ini_section) or {}
    section["sqlalchemy.url"] = settings.database_url
    connectable = engine_from_config(
        section, prefix="sqlalchemy.", poolclass=pool.NullPool
    )
    with connectable.connect() as connection:
        _bootstrap_version_table(connection)
        context.configure(
            connection=connection, target_metadata=target_metadata, compare_type=True,
            render_as_batch=True,
        )
        with context.begin_transaction():
            context.run_migrations()
        # pysqlite runs in legacy isolation mode, where DDL is *not* committed
        # automatically. Without this the upgrade prints "Running upgrade …",
        # exits 0, and then rolls every ALTER back when the connection closes.
        connection.commit()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
