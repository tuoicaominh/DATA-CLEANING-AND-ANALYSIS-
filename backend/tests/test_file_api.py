"""Integration checks against the local Docker API and PostgreSQL.

Run inside the API container: python -m unittest tests.test_file_api -v
Creates and cleans up its own isolated test accounts.
"""
import json
import unittest
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from uuid import uuid4

from sqlalchemy import delete, select

from app.db.session import SessionLocal
from app.models.uploaded_file import UploadedFile
from app.models.user import User
from app.utils.security import create_access_token


class FileApiTest(unittest.TestCase):
    def setUp(self):
        with SessionLocal() as db:
            self.users = [User(email=f"file-test-{uuid4()}@example.test", full_name="File API Test", hashed_password="not-a-login-password") for _ in range(2)]
            db.add_all(self.users)
            db.commit()
            self.ids = [u.id for u in self.users]
        self.tokens = [create_access_token(str(i)) for i in self.ids]
        self.file_id = str(uuid4())

    def tearDown(self):
        with SessionLocal() as db:
            db.execute(delete(UploadedFile).where(UploadedFile.owner_id.in_(self.ids)))
            db.execute(delete(User).where(User.id.in_(self.ids)))
            db.commit()

    def call(self, method, path="", body=None, account=0, headers=None):
        request_headers = headers or {}
        if account is not None:
            request_headers["Authorization"] = "Bearer " + self.tokens[account]
        request = Request("http://127.0.0.1:8000/api/files" + path, data=body, method=method, headers=request_headers)
        try:
            with urlopen(request, timeout=15) as response:
                return response.status, response.read()
        except HTTPError as error:
            return error.code, error.read()

    def upload(self, body=b"name,value\nA,123", name="data.csv"):
        return self.call("PUT", f"/{self.file_id}?" + urlencode({"name": name}), body)

    def test_persistence_isolation_retry_and_delete(self):
        content = b"name,value\nA,123"
        status, result = self.upload(content)
        self.assertEqual(status, 200, result)
        row = json.loads(result)
        self.assertEqual((row["name"], row["size"]), ("data.csv", len(content)))
        with SessionLocal() as db:
            stored = db.get(UploadedFile, (self.ids[0], self.file_id))
            self.assertEqual(stored.content, content)
        # A new request/session reads the saved row; no frontend memory involved.
        status, result = self.call("GET")
        self.assertEqual(status, 200)
        self.assertEqual([f["id"] for f in json.loads(result)], [self.file_id])
        self.assertEqual(self.call("GET", f"/{self.file_id}/content"), (200, content))
        self.assertEqual(self.upload(content)[0], 200)
        self.assertEqual(len(json.loads(self.call("GET")[1])), 1)
        self.assertEqual(self.upload(b"different")[0], 409)
        self.assertEqual(json.loads(self.call("GET", account=1)[1]), [])
        self.assertEqual(self.call("GET", f"/{self.file_id}/content", account=1)[0], 404)
        self.assertEqual(self.call("DELETE", f"/{self.file_id}", account=1)[0], 204)
        self.assertEqual(self.call("GET", f"/{self.file_id}/content")[1], content)
        self.assertEqual(self.call("DELETE", f"/{self.file_id}")[0], 204)
        self.assertEqual(json.loads(self.call("GET")[1]), [])
        self.assertEqual(self.call("GET", f"/{self.file_id}/content")[0], 404)
        self.assertEqual(self.call("DELETE", f"/{self.file_id}")[0], 204)

    def test_validation_and_authentication(self):
        self.assertEqual(self.call("GET", account=None)[0], 401)
        self.assertEqual(self.call("PUT", f"/{self.file_id}?name=a.csv", b"x", account=None)[0], 401)
        self.assertEqual(self.call("DELETE", f"/{self.file_id}", account=None)[0], 401)
        for name in ["file.exe", "../file.csv", "folder\\file.json"]:
            self.assertEqual(self.upload(name=name)[0], 400)
        status, body = self.call("PUT", f"/{self.file_id}?name=large.csv", b"x", headers={"Content-Length": str(50*1024*1024+1)})
        self.assertEqual(status, 413, body)
        self.assertEqual(json.loads(self.call("GET")[1]), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
