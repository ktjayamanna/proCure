"""rename_schemas_and_remove_role

Revision ID: ca102bd459f9
Revises: add_auth_fields
Create Date: 2025-04-16 11:23:19.423242

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ca102bd459f9'
down_revision: Union[str, None] = 'add_auth_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop indexes first
    op.drop_index('idx_user_device_tokens_token', table_name='user_device_tokens')
    op.drop_index('idx_user_device_tokens_user_device', table_name='user_device_tokens')

    # Rename tables
    op.rename_table('users', 'employees')
    op.rename_table('user_activity', 'employee_activity')
    op.rename_table('user_device_tokens', 'employee_device_tokens')

    # Update foreign key constraints
    op.execute('ALTER TABLE employee_activity RENAME CONSTRAINT user_activity_user_id_fkey TO employee_activity_user_id_fkey')
    op.execute('ALTER TABLE employee_device_tokens RENAME CONSTRAINT user_device_tokens_user_id_fkey TO employee_device_tokens_user_id_fkey')
    # Update the foreign key for purchased_saas to point to employees
    op.drop_constraint('purchased_saas_owner_fkey', 'purchased_saas', type_='foreignkey')
    op.create_foreign_key('purchased_saas_owner_fkey', 'purchased_saas', 'employees', ['owner'], ['user_id'])

    # Remove role column from employees table
    op.drop_column('employees', 'role')

    # Recreate indexes with new table name
    op.create_index('idx_employee_device_tokens_token', 'employee_device_tokens', ['token'])
    op.create_index('idx_employee_device_tokens_user_device', 'employee_device_tokens', ['user_id', 'device_id'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop new indexes
    op.drop_index('idx_employee_device_tokens_token', table_name='employee_device_tokens')
    op.drop_index('idx_employee_device_tokens_user_device', table_name='employee_device_tokens')

    # Add role column back to employees table
    op.add_column('employees', sa.Column('role', sa.String(), nullable=True))

    # Rename foreign key constraints back
    op.execute('ALTER TABLE employee_activity RENAME CONSTRAINT employee_activity_user_id_fkey TO user_activity_user_id_fkey')
    op.execute('ALTER TABLE employee_device_tokens RENAME CONSTRAINT employee_device_tokens_user_id_fkey TO user_device_tokens_user_id_fkey')
    # Update the foreign key for purchased_saas to point back to users
    op.drop_constraint('purchased_saas_owner_fkey', 'purchased_saas', type_='foreignkey')

    # Rename tables back
    op.rename_table('employees', 'users')
    op.rename_table('employee_activity', 'user_activity')
    op.rename_table('employee_device_tokens', 'user_device_tokens')

    # Recreate the foreign key constraint
    op.create_foreign_key('purchased_saas_owner_fkey', 'purchased_saas', 'users', ['owner'], ['user_id'])

    # Recreate original indexes
    op.create_index('idx_user_device_tokens_user_device', 'user_device_tokens', ['user_id', 'device_id'], unique=True)
    op.create_index('idx_user_device_tokens_token', 'user_device_tokens', ['token'], unique=False)
