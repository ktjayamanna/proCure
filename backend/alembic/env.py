from logging.config import fileConfig
import os
from alembic import context
from procure.db.models import Base
from procure.db.engine import engine

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Don't set sqlalchemy.url in the config to avoid interpolation issues
# We'll use the engine directly in run_migrations_online

def run_migrations_offline() -> None:
    # Use DATABASE_URL from environment or fall back to engine URL
    url = os.getenv("DATABASE_URL") or engine.url.render_as_string(hide_password=False)
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def process_revision_directives(context, revision, directives):  # pylint: disable=unused-argument
    # This function can be customized if needed
    # Unused parameters are kept for the correct function signature
    pass

def run_migrations_online() -> None:
    # Skip DB connection if we're just generating migrations
    if context.get_x_argument(as_dictionary=True).get('command') == 'revision':
        context.configure(
            target_metadata=target_metadata,
            process_revision_directives=process_revision_directives
        )
        with context.begin_transaction():
            context.run_migrations()
        return

    # Use the existing engine instead of creating a new one from config
    # This avoids the need to set sqlalchemy.url in the config
    connectable = engine.execution_options(isolation_level="AUTOCOMMIT")

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
