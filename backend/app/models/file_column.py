from sqlalchemy import BigInteger, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FileColumn(Base):
    __tablename__ = "file_columns"
    __table_args__ = (Index("uq_file_columns_file_position", "file_id", "ordinal_position", unique=True),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    file_id: Mapped[int] = mapped_column(ForeignKey("data_files.id", ondelete="CASCADE"), nullable=False, index=True)
    ordinal_position: Mapped[int] = mapped_column(Integer, nullable=False)
    column_name: Mapped[str] = mapped_column(String(255), nullable=False)
    inferred_type: Mapped[str] = mapped_column(String(32), nullable=False)
    missing_count: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    distinct_count: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    profile_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
