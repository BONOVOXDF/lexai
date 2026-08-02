# Generate a secure random secret key for JWT signing.
# Usage: python scripts/generate_secret.py
import secrets


def main() -> None:
    print(secrets.token_urlsafe(48))


if __name__ == "__main__":
    main()
