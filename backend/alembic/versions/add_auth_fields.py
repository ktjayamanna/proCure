"""add auth fields

Revision ID: add_auth_fields
Revises: b95d08279ce5
Create Date: 2023-05-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_auth_fields'
down_revision: Union[str, None] = 'b95d08279ce5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new columns to users table
    op.add_column('users', sa.Column('password_hash', sa.String(), nullable=True))
    op.add_column('users', sa.Column('company_name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('role', sa.String(), nullable=True))
    op.add_column('users', sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False))
    
    # Create user_device_tokens table
    op.create_table('user_device_tokens',
        sa.Column('token_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('device_id', sa.String(), nullable=False),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ),
        sa.PrimaryKeyConstraint('token_id'),
        sa.UniqueConstraint('token')
    )
    # Add index for faster token lookups
    op.create_index('idx_user_device_tokens_token', 'user_device_tokens', ['token'])
    # Add index for user_id and device_id combination
    op.create_index('idx_user_device_tokens_user_device', 'user_device_tokens', ['user_id', 'device_id'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop user_device_tokens table
    op.drop_index('idx_user_device_tokens_token', table_name='user_device_tokens')
    op.drop_index('idx_user_device_tokens_user_device', table_name='user_device_tokens')
    op.drop_table('user_device_tokens')
    
    # Remove columns from users table
    op.drop_column('users', 'created_at')
    op.drop_column('users', 'role')
    op.drop_column('users', 'company_name')
    op.drop_column('users', 'password_hash')
