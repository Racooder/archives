from flask import Flask, request
import json
import archives

app = Flask(__name__)

@app.route("/archives", methods=["POST"])
def new_archive():
    name = request.json["name"]
    if name is None:
        return json.dumps({'error': 'Missing required fields'}), 400, {'ContentType': 'application/json'}

    archive = archives.Archive(name)
    archive.save()
    return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}

@app.route("/archives", methods=["GET"])
def list_archives():
    return json.dumps(archives.Archive.list()), 200, {'ContentType':'application/json'}

@app.route("/archivist/new/<archive>", methods=["POST"])
def new_archivist(archive):
    username = request.json["username"]
    display_name = request.json["displayName"]
    if username is None or display_name is None:
        return json.dumps({'error': 'Missing required fields'}), 400, {'ContentType': 'application/json'}

    archive = archives.Archive.load(archive)
    if archive is None:
        return json.dumps({'error': 'Archive not found'}), 404, {'ContentType': 'application/json'}
    archives.Archivist(archive, username, display_name).save()
    return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}

@app.route("/archivist/display-name/<archive>", methods=["POST"])
def set_display_name(archive):
    name = request.json["name"]
    display_name = request.json["displayName"]
    if name is None or display_name is None:
        return json.dumps({'error': 'Missing required fields'}), 400, {'ContentType': 'application/json'}

    archive = archives.Archive.load(archive)
    if archive is None:
        return json.dumps({'error': 'Archive not found'}), 404, {'ContentType': 'application/json'}
    archivist = archives.Archivist.load(archive, name)
    if archivist is None:
        return json.dumps({'error': 'Archivist not found'}), 404, {'ContentType': 'application/json'}
    archivist.display_name = display_name
    archivist.save()
    return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}

@app.route("/archivist/<archive>/<username>", methods=["GET"])
def get_user(archive, username):
    archive_obj = archives.Archive.load(archive)
    if archive_obj is None:
        return json.dumps({'error': 'Archive not found'}), 404, {'ContentType': 'application/json'}
    archivist = archives.Archivist.load(archive_obj, username)
    if archivist is None:
        return json.dumps({'error': 'Archivist not found'}), 404, {'ContentType': 'application/json'}
    return json.dumps(archivist.dict()), 200, {'ContentType':'application/json'}

@app.route("/document/<archive>", methods=["POST"])
def new_document(archive):
    blob_string = request.json["blob"]
    name = request.json["name"]
    file_type = request.json["fileType"]
    archivist = request.json["archivist"]
    if blob_string is None or name is None or file_type is None or archivist is None:
        return json.dumps({'error': 'Missing required fields'}), 400, {'ContentType': 'application/json'}

    archive = archives.Archive.load(archive)
    if archive is None:
        return json.dumps({'error': 'Archive not found'}), 404, {'ContentType': 'application/json'}
    meta = archives.DocumentMeta(name, file_type, archivist)
    document = archives.Document(archive, blob_string.encode("utf-8"), meta)
    document.save()
    return json.dumps({'success': True, 'hash': document.hash}), 200, {'ContentType': 'application/json'}

@app.route("/document/<archive>/<doc_hash>", methods=["GET"])
def get_document(archive, doc_hash):
    archive_obj = archives.Archive.load(archive)
    document = archives.Document.load(archive_obj, doc_hash)
    if document is None:
        return json.dumps({'error': 'Document not found'}), 404, {'ContentType': 'application/json'}
    return json.dumps(document.dict()), 200, {'ContentType':'application/json'}

@app.route("/document-meta/<archive>/<doc_hash>", methods=["GET"])
def get_document_meta(archive, doc_hash):
    archive_obj = archives.Archive.load(archive)
    if archive_obj is None:
        return json.dumps({'error': 'Archive not found'}), 404, {'ContentType': 'application/json'}
    meta = archives.DocumentMeta.load(archive_obj, doc_hash)
    if meta is None:
        return json.dumps({'error': 'Document not found'}), 404, {'ContentType': 'application/json'}
    return json.dumps(meta.dict()), 200, {'ContentType':'application/json'}

@app.route("/collection/<archive>", methods=["POST"])
def new_collection(archive):
    name = request.json["name"]
    creator = request.json["creator"]
    if name is None or creator is None:
        return json.dumps({'error': 'Missing required fields'}), 400, {'ContentType': 'application/json'}

    archive = archives.Archive.load(archive)
    if archive is None:
        return json.dumps({'error': 'Archive not found'}), 404, {'ContentType': 'application/json'}
    creator_obj = archives.Archivist.load(archive, creator)
    if creator_obj is None:
        return json.dumps({'error': 'Creator not found'}), 404, {'ContentType': 'application/json'}
    collection = archives.Collection(archive, name, creator)
    collection.save()
    return json.dumps({'success': True, 'uuid': collection.uuid}), 200, {'ContentType': 'application/json'}

@app.route("/collection/<archive>/<uuid>", methods=["GET"])
def get_collection(archive, uuid):
    archive_obj = archives.Archive.load(archive)
    if archive_obj is None:
        return json.dumps({'error': 'Archive not found'}), 404, {'ContentType': 'application/json'}
    collection = archives.Collection.load(archive_obj, uuid)
    if collection is None:
        return json.dumps({'error': 'Collection not found'}), 404, {'ContentType': 'application/json'}
    return json.dumps(collection.dict()), 200, {'ContentType':'application/json'}

@app.route("/collection/<archive>/<uuid>", methods=["POST"])
def add_document_to_collection(archive, uuid):
    doc_hash = request.json["document"]
    if doc_hash is None:
        return json.dumps({'error': 'Missing required fields'}), 400, {'ContentType': 'application/json'}

    archive_obj = archives.Archive.load(archive)
    if archive_obj is None:
        return json.dumps({'error': 'Archive not found'}), 404, {'ContentType': 'application/json'}
    collection = archives.Collection.load(archive_obj, uuid)
    if collection is None:
        return json.dumps({'error': 'Collection not found'}), 404, {'ContentType': 'application/json'}
    document = archives.Document.load(archive_obj, doc_hash)
    if document is None:
        return json.dumps({'error': 'Document not found'}), 404, {'ContentType': 'application/json'}
    collection.add_document(doc_hash)
    return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}

@app.route("/collection/<archive>/<uuid>/<doc_hash>", methods=["DELETE"])
def remove_document_from_collection(archive, uuid, doc_hash):
    archive_obj = archives.Archive.load(archive)
    if archive_obj is None:
        return json.dumps({'error': 'Archive not found'}), 404, {'ContentType': 'application/json'}
    collection = archives.Collection.load(archive_obj, uuid)
    if collection is None:
        return json.dumps({'error': 'Collection not found'}), 404, {'ContentType': 'application/json'}
    if collection.remove_document(doc_hash):
        return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}
    return json.dumps({'error': 'Document not found in collection'}), 404, {'ContentType': 'application/json'}

@app.route("/collection/reorder/<archive>/<uuid>", methods=["POST"])
def reorder_document_in_collections(archive, uuid):
    doc_hash = request.json["document"]
    index = request.json["index"]
    if doc_hash is None or index is None:
        return json.dumps({'error': 'Missing required fields'}), 400, {'ContentType': 'application/json'}

    archive_obj = archives.Archive.load(archive)
    if archive_obj is None:
        return json.dumps({'error': 'Archive not found'}), 404, {'ContentType': 'application/json'}
    collection = archives.Collection.load(archive_obj, uuid)
    if collection is None:
        return json.dumps({'error': 'Collection not found'}), 404, {'ContentType': 'application/json'}
    if collection.reorder_document(doc_hash, index):
        return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}
    return json.dumps({'error': 'Document not found in collection'}), 404, {'ContentType': 'application/json'}

@app.route("/collection/tag/<archive>/<uuid>", methods=["POST"])
def add_tag_to_collection(archive, uuid):
    tag = request.json["tag"]
    if tag is None:
        return json.dumps({'error': 'Missing required fields'}), 400, {'ContentType': 'application/json'}

    archive_obj = archives.Archive.load(archive)
    if archive_obj is None:
        return json.dumps({'error': 'Archive not found'}), 404, {'ContentType': 'application/json'}
    collection = archives.Collection.load(archive_obj, uuid)
    if collection is None:
        return json.dumps({'error': 'Collection not found'}), 404, {'ContentType': 'application/json'}
    if collection.add_tag(tag):
        return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}
    return json.dumps({'error': 'Tag already exists in collection'}), 400, {'ContentType': 'application/json'}

@app.route("/collection/tag/<archive>/<uuid>", methods=["DELETE"])
def remove_tag_from_collection(archive, uuid):
    tag = request.json["tag"]
    if tag is None:
        return json.dumps({'error': 'Missing required fields'}), 400, {'ContentType': 'application/json'}

    archive_obj = archives.Archive.load(archive)
    if archive_obj is None:
        return json.dumps({'error': 'Archive not found'}), 404, {'ContentType': 'application/json'}
    collection = archives.Collection.load(archive_obj, uuid)
    if collection is None:
        return json.dumps({'error': 'Collection not found'}), 404, {'ContentType': 'application/json'}
    if collection.remove_tag(tag):
        return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}
    return json.dumps({'error': 'Tag doesn\'t exist in collection'}), 400, {'ContentType': 'application/json'}

@app.route("/tag/list/<archive>", methods=["GET"])
def list_tags(archive):
    archive_obj = archives.Archive.load(archive)
    if archive_obj is None:
        return json.dumps({'error': 'Archive not found'}), 404, {'ContentType': 'application/json'}
    return json.dumps(archives.Tag.list(archive_obj)), 200, {'ContentType':'application/json'}

@app.route("/tag/collections/<archive>/<tag>", methods=["GET"])
def list_collections_with_tags(archive, tag):
    archive_obj = archives.Archive.load(archive)
    if archive_obj is None:
        return json.dumps({'error': 'Archive not found'}), 404, {'ContentType': 'application/json'}
    return json.dumps(archives.Tag(archive_obj, tag).collections), 200, {'ContentType':'application/json'}

if __name__ == "__main__":
    from waitress import serve
    serve(app, host="0.0.0.0", port=8080)
