import falcon
import uuid
import time
from binascii import a2b_base64
from archive.documents import create_document
from archive.commits import create_commit

active_uploads = {}

class Upload(object):
    def on_post(self, req: falcon.Request, resp: falcon.Response, archive = ""):
        if archive == "":
            resp.text = "Missing archive"
            resp.status = falcon.HTTP_400
            return

        upload_id = str(uuid.uuid4())
        active_uploads[upload_id] = {
            "changes": [],
            "last_change": time.time(),
            "archive": archive
        }
        resp.text = upload_id
        resp.status = falcon.HTTP_201



class CommitUpload(object):
    def on_post(self, req: falcon.Request, resp: falcon.Response, id = ""):
        if id not in active_uploads:
            resp.text = "Upload not found"
            resp.status = falcon.HTTP_404
            return

        changes = active_uploads[id]["changes"]

        if len(changes) == 0:
            resp.text = "No changes"
            resp.status = falcon.HTTP_400
            return

        del active_uploads[id]
        archive = active_uploads[id]["archive"]
