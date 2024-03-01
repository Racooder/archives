from falcon import App
from wsgiref import simple_server
from routes import documents, commits, upload, archive

def add_routes(app: App):
    app.add_route("/documents/{archive}/{hash}", documents.Documents())
    app.add_route("/documents/{archive}/{hash}/title/{title}", documents.ChangeTitle())
    app.add_route("/documents/{archive}/{hash}/filetype/{filetype}", documents.ChangeFiletype())
    app.add_route("/documents/{archive}", documents.Upload())
    app.add_route("/commits/{archive}", commits.ListCommits())
    app.add_route("/commits/{archive}/{hash}", commits.GetCommit())
    app.add_route("/commits/head/{archive}", commits.GetHead())
    app.add_route("/archives/new/{name}", archive.NewArchive())
    app.add_route("/archives/list", archive.ListArchives())

if __name__ == "__main__":
    app = App(cors_enable=True)

    add_routes(app)

    httpd = simple_server.make_server("", 3000, app)
    httpd.serve_forever()
