# ============================================================
# FILE: backend/migrate_add_features.py
# CHẠY 1 LẦN để thêm các cột mới vào database hiện có
# Chạy: python migrate_add_features.py
# ============================================================

from app.database.database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:

        # ── Kiểm tra và thêm cột users.status ────────────────────────────
        result = conn.execute(text("""
            SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'status'
        """))
        if result.scalar() == 0:
            conn.execute(text("""
                ALTER TABLE users ADD status NVARCHAR(20) NOT NULL DEFAULT 'active'
            """))
            print("✅ Thêm cột users.status")
        else:
            print("⏭  users.status đã tồn tại")

        # ── Kiểm tra và thêm cột users.ban_until ─────────────────────────
        result = conn.execute(text("""
            SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'ban_until'
        """))
        if result.scalar() == 0:
            conn.execute(text("""
                ALTER TABLE users ADD ban_until DATETIME NULL
            """))
            print("✅ Thêm cột users.ban_until")
        else:
            print("⏭  users.ban_until đã tồn tại")

        # ── Kiểm tra và thêm cột ratings.rated_role ──────────────────────
        result = conn.execute(text("""
            SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'ratings' AND COLUMN_NAME = 'rated_role'
        """))
        if result.scalar() == 0:
            conn.execute(text("""
                ALTER TABLE ratings ADD rated_role NVARCHAR(10) NULL
            """))
            print("✅ Thêm cột ratings.rated_role")
        else:
            print("⏭  ratings.rated_role đã tồn tại")

        conn.commit()

    print("\n✅ Migration hoàn tất!")


if __name__ == "__main__":
    run_migration()