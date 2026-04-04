import traceback
try:
    from database.database import SessionLocal
    from models.models import User
    db = SessionLocal()
    print(db.query(User).first())
except Exception as e:
    with open('error_out.txt', 'w', encoding='utf-8') as f:
        traceback.print_exc(file=f)
