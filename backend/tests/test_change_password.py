"""Password-change integration checks using an isolated disposable account."""
import json
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4

from app.db.session import SessionLocal
from app.models.user import User
from app.utils.security import create_access_token, hash_password, verify_password


class ChangePasswordTest(unittest.TestCase):
    def setUp(self):
        self.password = "Original-password-123"
        self.new_password = "Updated-password-456"
        self.email = f"password-test-{uuid4()}@example.com"
        with SessionLocal() as db:
            user = User(email=self.email, full_name="Password Test", hashed_password=hash_password(self.password))
            db.add(user)
            db.commit()
            self.user_id = user.id
        self.token = create_access_token(str(self.user_id))

    def tearDown(self):
        with SessionLocal() as db:
            db.delete(db.get(User, self.user_id))
            db.commit()

    def call(self, path, payload, authenticated=True):
        headers = {"Content-Type": "application/json"}
        if authenticated:
            headers["Authorization"] = "Bearer " + self.token
        request = Request("http://127.0.0.1:8000/api/auth/" + path, data=json.dumps(payload).encode(), headers=headers, method="POST")
        try:
            with urlopen(request, timeout=15) as response:
                return response.status, json.loads(response.read())
        except HTTPError as error:
            return error.code, json.loads(error.read())

    def payload(self, **overrides):
        return {"current_password": self.password, "new_password": self.new_password, "confirm_password": self.new_password, **overrides}

    def test_success_changes_hash_and_login(self):
        status, result = self.call("change-password", self.payload())
        self.assertEqual(status, 200, result)
        self.assertEqual(set(result), {"message"})
        with SessionLocal() as db:
            stored = db.get(User, self.user_id).hashed_password
            self.assertNotEqual(stored, self.new_password)
            self.assertTrue(verify_password(self.new_password, stored))
            self.assertFalse(verify_password(self.password, stored))
        self.assertEqual(self.call("sign-in", {"email": self.email, "password": self.password}, False)[0], 401)
        self.assertEqual(self.call("sign-in", {"email": self.email, "password": self.new_password}, False)[0], 200)

    def test_rejects_invalid_requests_without_changing_password(self):
        self.assertEqual(self.call("change-password", self.payload(), False)[0], 401)
        self.assertEqual(self.call("change-password", self.payload(current_password="wrong"))[0], 400)
        self.assertEqual(self.call("change-password", self.payload(confirm_password="Not-matching-123"))[0], 422)
        self.assertEqual(self.call("change-password", self.payload(new_password="short", confirm_password="short"))[0], 422)
        self.assertEqual(self.call("change-password", self.payload(new_password=self.password, confirm_password=self.password))[0], 422)
        self.assertEqual(self.call("sign-in", {"email": self.email, "password": self.password}, False)[0], 200)


if __name__ == "__main__":
    unittest.main(verbosity=2)
