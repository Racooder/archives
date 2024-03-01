import os
import msgpack
from archive.archives import archive_path, hash_sha256
from src.archive.archives import DOCUMENTS_PATH, TAGS_PATH

TAG_DELIMITER = "\n"

class Document(object):
    def __init__(self, archive: str, hash: str, data: bytes, meta: dict):
        self.archive = archive
        self.hash = hash
        self.data = data
        self.meta = meta

    @staticmethod
    def from_blob(archive: str, blob: bytes):
        meta_bytes_len = int.from_bytes(blob[:4], "big")
        meta_bytes = blob[4:4+meta_bytes_len]
        meta = msgpack.unpackb(meta_bytes)
        data = blob[4+meta_bytes_len:]
        return Document(archive, hash_sha256(data), data, meta)

    def get_path(self):
        return archive_path(self.archive) + DOCUMENTS_PATH + self.hash[:2] + "/" + self.hash[2:]

    def get_blob(self):
        meta_bytes = msgpack.packb(self.meta)
        if meta_bytes is None:
            meta_bytes = b""
        meta_bytes_len = len(meta_bytes).to_bytes(4, "big")
        return meta_bytes_len + meta_bytes + self.data

    def save(self):
        os.makedirs(os.path.dirname(self.get_path()), exist_ok=True)
        with open(self.get_path(), "wb") as file:
            file.write(self.get_blob())

def create_document(archive: str, data: bytes, meta: dict):
    """Creates a document and return its hash. If the document already exists, return its hash and False."""
    document_hash = hash_sha256(data)
    document = Document(archive, document_hash, data, meta)
    if os.path.exists(document.get_path()):
        return document_hash, False
    document.save()
    return document_hash, True

def get_document(archive: str, hash: str):
    """Returns a document by its hash."""
    if not os.path.exists(archive_path(archive) + DOCUMENTS_PATH + hash[:2] + "/" + hash[2:]):
        return None
    with open(archive_path(archive) + DOCUMENTS_PATH + hash[:2] + "/" + hash[2:], "rb") as file:
        return Document.from_blob(archive, file.read())

def delete_document(archive: str, hash: str):
    """Deletes a document by its hash."""
    if not os.path.exists(archive_path(archive) + DOCUMENTS_PATH + hash[:2] + "/" + hash[2:]):
        return False
    os.remove(DOCUMENTS_PATH + hash[:2] + "/" + hash[2:])
    return True

def rename_file(archive: str, hash: str, new_title: str):
    """Renames a document. If the document does not exist, return False."""
    document = get_document(archive, hash)
    if not document:
        return False
    document.meta["title"] = new_title
    document.save()
    return True

def change_filetype(archive: str, hash: str, new_filetype: str):
    """Changes the filetype of a document."""
    document = get_document(archive, hash)
    if not document:
        return
    document.meta["filetype"] = new_filetype
    document.save()

def add_tag(archive: str, hash: str, tag: str):
    """Adds a tag to a document."""
    document = get_document(archive, hash)
    if not document:
        return False
    document.meta["tags"].append(tag)
    document.save()
    with open(archive_path(archive) + TAGS_PATH + tag, "r+w") as file:
        docs = file.read().split(TAG_DELIMITER)
        if hash not in docs:
            docs.append(hash)
        file.write(TAG_DELIMITER.join(docs))
    return True

def remove_tag(archive: str, hash: str, tag: str):
    """Removes a tag from a document."""
    document = get_document(archive, hash)
    if not document:
        return False
    document.meta["tags"].remove(tag)
    document.save()
    with open(archive_path(archive) + TAGS_PATH + tag, "r+w") as file:
        docs = file.read().split(TAG_DELIMITER)
        if hash in docs:
            docs.remove(hash)
        file.write(TAG_DELIMITER.join(docs))
    return True

def rename_tag(archive: str, old_tag: str, new_tag: str):
    """Renames a tag."""
    with open(archive_path(archive) + TAGS_PATH + old_tag, "r") as file:
        tag_data = file.read()
    docs = tag_data.split(TAG_DELIMITER)
    os.remove(archive_path(archive) + TAGS_PATH + old_tag)
    with open(archive_path(archive) + TAGS_PATH + new_tag, "w") as file:
        file.write(tag_data)
    for doc in docs:
        document = get_document(archive, doc)
        if not document:
            continue
        document.meta["tags"].remove(old_tag)
        document.meta["tags"].append(new_tag)
        document.save()

def get_documents_by_tag(archive: str, tag: str):
    """Returns a list of documents by a tag."""
    with open(archive_path(archive) + TAGS_PATH + tag, "r") as file:
        docs = file.read().split(TAG_DELIMITER)
    return [get_document(archive, doc) for doc in docs]
