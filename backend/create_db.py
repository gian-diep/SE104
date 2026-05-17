"""
create_db.py — Dùng cho SQL Server
Chạy: python create_db.py
"""

from sqlalchemy import text

from app.database.database import engine, Base
from app.database import models  # noqa: F401


def drop_all_fk_constraints(conn):
    """Xóa toàn bộ foreign key constraints"""
    fks = conn.execute(text("""
        SELECT
            fk.name AS fk_name,
            tp.name AS table_name
        FROM sys.foreign_keys fk
        JOIN sys.tables tp
            ON fk.parent_object_id = tp.object_id
    """)).fetchall()

    for fk_name, table_name in fks:
        try:
            conn.execute(
                text(f"ALTER TABLE [{table_name}] DROP CONSTRAINT [{fk_name}]")
            )
            print(f"  Dropped FK [{fk_name}] on [{table_name}]")
        except Exception as e:
            print(f"  Skip FK [{fk_name}] -> {e}")


# DROP theo thứ tự phụ thuộc
DROP_ORDER = [
    "ratings",
    "messages",
    "chat_sessions",
    "chat_requests",
    "reports",
    "listings",
    "users",
]


def drop_tables():
    print("Dropping all FK constraints first...")

    with engine.begin() as conn:
        drop_all_fk_constraints(conn)

    print("\nDropping tables...")

    with engine.begin() as conn:
        for table in DROP_ORDER:
            try:
                exists = conn.execute(text("""
                    SELECT COUNT(*)
                    FROM INFORMATION_SCHEMA.TABLES
                    WHERE TABLE_NAME = :t
                    AND TABLE_SCHEMA = 'dbo'
                """), {"t": table}).scalar()

                if exists:
                    conn.execute(text(f"DROP TABLE [{table}]"))
                    print(f"  Dropped: {table}")
                else:
                    print(f"  Skipped (not found): {table}")

            except Exception as e:
                print(f"  Failed dropping {table}: {e}")


def create_tables():
    print("\nCreating tables...")
    Base.metadata.create_all(bind=engine)
    print("Done.")


if __name__ == "__main__":
    drop_tables()
    create_tables()