from archive.commits import get_commits, get_commit, get_head
import falcon
import json

class ListCommits(object):
    def on_get(self, req: falcon.Request, resp: falcon.Response, archive = "", count = 0):
        if archive == "":
            resp.text = "Missing archive"
            resp.status = falcon.HTTP_400
            return
        if count == 0:
            resp.text = "Missing count"
            resp.status = falcon.HTTP_400
            return

        commits = get_commits(archive, count)
        resp.text = json.dumps(commits)
        resp.status = falcon.HTTP_200

class GetCommit(object):
    def on_get(self, req: falcon.Request, resp: falcon.Response, archive = "", hash = ""):
        if archive == "":
            resp.text = "Missing archive"
            resp.status = falcon.HTTP_400
            return
        if hash == "":
            resp.text = "Missing hash"
            resp.status = falcon.HTTP_400
            return

        commit = get_commit(archive, hash)

        if commit is None:
            resp.text = "Commit not found"
            resp.status = falcon.HTTP_404
            return

        resp.text = json.dumps(commit)
        resp.status = falcon.HTTP_200

class GetHead(object):
    def on_get(self, req: falcon.Request, resp: falcon.Response, archive = ""):
        if archive == "":
            resp.text = "Missing archive"
            resp.status = falcon.HTTP_400
            return

        head = get_head(archive)
        resp.text = head
        resp.status = falcon.HTTP_200
