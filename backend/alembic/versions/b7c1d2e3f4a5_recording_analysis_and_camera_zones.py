"""recording analysis and camera zones

Revision ID: b7c1d2e3f4a5
Revises: e4d73b38f52f
Create Date: 2026-10-19 12:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b7c1d2e3f4a5'
down_revision: str | Sequence[str] | None = 'e4d73b38f52f'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('detection_events', schema=None) as batch_op:
        batch_op.add_column(sa.Column('recording_id', sa.String(length=36), nullable=True))
        batch_op.create_index(batch_op.f('ix_detection_events_recording_id'), ['recording_id'], unique=False)
        batch_op.create_foreign_key(
            'fk_detection_events_recording_id', 'recordings', ['recording_id'], ['id'], ondelete='CASCADE'
        )
    with op.batch_alter_table('cameras', schema=None) as batch_op:
        batch_op.add_column(sa.Column('zones', sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('cameras', schema=None) as batch_op:
        batch_op.drop_column('zones')
    with op.batch_alter_table('detection_events', schema=None) as batch_op:
        batch_op.drop_constraint('fk_detection_events_recording_id', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_detection_events_recording_id'))
        batch_op.drop_column('recording_id')
