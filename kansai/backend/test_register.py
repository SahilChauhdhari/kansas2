import os
import sys
import traceback

# Add the current directory to sys.path to import local modules
sys.path.append(os.getcwd())

from database.database import get_db, SessionLocal
from models.models import User
from routes.auth import get_password_hash

print("Testing user registration logic...")

try:
    db = SessionLocal()
    
    username = "test_user_script"
    email = "test_script@example.com"
    password = "Password123!"
    
    # Check if exists
    db_user = db.query(User).filter(User.username == username).first()
    if db_user:
        print("User already exists. Deleting...")
        db.delete(db_user)
        db.commit()
    
    hashed_password = get_password_hash(password)
    print(f"Hashed password: {hashed_password[:10]}...")
    
    new_user = User(
        username=username,
        email=email,
        password_hash=hashed_password,
        is_admin=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    print(f"User created successfully! ID: {new_user.id}")
except Exception as e:
    print(f"Error during user creation: {e}")
    traceback.print_exc()
    sys.exit(1)
finally:
    db.close()
