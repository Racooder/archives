import falcon
from src.archive.archives import list_archives, new_archive

class NewArchive(object):
    def on_push(self, req: falcon.Request, resp: falcon.Response, name = ""):
        if name == "":
            resp.text = "Missing name"
            resp.status = falcon.HTTP_400
            return

        new_archive(name)
        resp.status = falcon.HTTP_201

class ListArchives(object):
    def on_get(self, req: falcon.Request, resp: falcon.Response):
        resp.media = list_archives()
        resp.status = falcon.HTTP_200