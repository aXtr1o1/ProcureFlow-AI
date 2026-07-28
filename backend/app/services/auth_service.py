from sqlalchemy.orm import Session

from app.database.models import User
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
)


class AuthService:

    @staticmethod
    def register(
        db: Session,
        username: str,
        email: str,
        password: str,
    ):
        """
        Register a new user.
        """

        # Check if username already exists
        existing_user = (
            db.query(User)
            .filter(User.username == username)
            .first()
        )

        if existing_user:
            raise Exception("Username already exists.")

        # Check if email already exists
        existing_email = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if existing_email:
            raise Exception("Email already exists.")

        # Create new user
        new_user = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return new_user

    @staticmethod
    def login(
        db: Session,
        username: str,
        password: str,
    ):
        """
        Authenticate user and generate JWT token.
        """

        user = (
            db.query(User)
            .filter(User.username == username)
            .first()
        )

        if not user:
            raise Exception("Invalid username or password.")

        if not verify_password(
            password,
            user.password_hash,
        ):
            raise Exception("Invalid username or password.")

        access_token = create_access_token(
            {
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
            }
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user,
        }

    @staticmethod
    def get_user(
        db: Session,
        username: str,
    ):
        """
        Get user details.
        """

        return (
            db.query(User)
            .filter(User.username == username)
            .first()
        )

    @staticmethod
    def logout():
        """
        Logout user.
        """

        return {
            "message": "Logout successful."
        }