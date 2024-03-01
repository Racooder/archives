from binascii import a2b_base64
import falcon
from archive.documents import create_document, get_document, delete_document, rename_file, change_filetype
import json

class Documents(object):
    def on_get(self, req: falcon.Request, resp: falcon.Response, archive = "", hash = ""):
        if archive == "":
            resp.text = "Missing archive"
            resp.status = falcon.HTTP_400
            return
        if hash == "":
            resp.text = "Missing hash"
            resp.status = falcon.HTTP_400
            return

        document = get_document(archive, hash)

        if document is None:
            resp.text = "Document not found"
            resp.status = falcon.HTTP_404
            return

        resp_dict = {
            "meta": document.meta,
            "data": document.data.decode("utf-8")
        }
        resp.text = json.dumps(resp_dict)
        resp.status = falcon.HTTP_200

    def on_delete(self, req: falcon.Request, resp: falcon.Response, archive = "", hash = ""):
        if archive == "":
            resp.text = "Missing archive"
            resp.status = falcon.HTTP_400
            return
        if hash == "":
            resp.text = "Missing hash"
            resp.status = falcon.HTTP_400
            return

        success = delete_document(archive, hash)

        if not success:
            resp.text = "Document not found"
            resp.status = falcon.HTTP_404
            return

        resp.text = "Document deleted"
        resp.status = falcon.HTTP_200

class ChangeTitle(object):
    def on_post(self, req: falcon.Request, resp: falcon.Response, archive = "", hash = "", title = ""):
        if archive == "":
            resp.text = "Missing archive"
            resp.status = falcon.HTTP_400
            return
        if hash == "":
            resp.text = "Missing hash"
            resp.status = falcon.HTTP_400
            return
        if title == "":
            resp.text = "Missing title"
            resp.status = falcon.HTTP_400
            return

        success = rename_file(archive, hash, title)
        if not success:
            resp.text = "Document not found"
            resp.status = falcon.HTTP_404
            return
        resp.text = "Document renamed"
        resp.status = falcon.HTTP_200

class ChangeFiletype(object):
    def on_post(self, req: falcon.Request, resp: falcon.Response, archive = "", hash = "", filetype = ""):
        if archive == "":
            resp.text = "Missing archive"
            resp.status = falcon.HTTP_400
            return
        if hash == "":
            resp.text = "Missing hash"
            resp.status = falcon.HTTP_400
            return
        if filetype == "":
            resp.text = "Missing filetype"
            resp.status = falcon.HTTP_400
            return

        success = change_filetype(archive, hash, filetype)
        if not success:
            resp.text = "Document not found"
            resp.status = falcon.HTTP_404
            return
        resp.text = "Document filetype changed"
        resp.status = falcon.HTTP_200

class UploadDocument(object):
    def on_post(self, req: falcon.Request, resp: falcon.Response, archive = ""):
        if archive == "":
            resp.text = "Missing archive"
            resp.status = falcon.HTTP_400
            return

        file = result.get("data")
        meta = result.get("meta")

        if file is None or meta is None:
            resp.text = "Invalid file"
            resp.status = falcon.HTTP_400
            return

        base64_data = file.split(",")[1]
        data = a2b_base64(base64_data)
        hash, isNew = create_document(archive, data, meta)

        if not isNew:
            resp.text = hash
            resp.status = falcon.HTTP_409
            return
        resp.text = hash
        resp.status = falcon.HTTP_201
