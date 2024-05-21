from datetime import datetime
from os import path, makedirs, listdir
import json
from enum import Enum
from hashlib import sha256
from uuid import uuid1

ROOT_DIR = "archives"

class Archive:
    def __init__(self, name) -> None:
        self.name = name
        self.path = path.join(ROOT_DIR, name)
        self.meta = {
            "created": datetime.now().isoformat(),
        }

    @staticmethod
    def load(name):
        archive = Archive(name)
        if not path.exists(archive.meta_path()):
            return None
        with open(archive.meta_path(), "r") as file:
            archive.meta = json.load(file)
        return archive

    @staticmethod
    def list():
        return [name for name in listdir(ROOT_DIR)]

    def meta_path(self):
        return path.join(self.path, "meta.json")

    def save(self):
        if not path.exists(self.path):
            makedirs(self.path)
        self.meta["updated"] = datetime.now().isoformat()
        with open(self.meta_path(), "w") as file:
            json.dump(self.meta, file)
        if not path.exists(path.join(self.path, "archivists")):
            makedirs(path.join(self.path, "archivists"))
        if not path.exists(path.join(self.path, "documents")):
            makedirs(path.join(self.path, "documents"))
        if not path.exists(path.join(self.path, "tags")):
            makedirs(path.join(self.path, "tags"))
        if not path.exists(path.join(self.path, "collections")):
            makedirs(path.join(self.path, "collections"))

class ArchivistStat(Enum):
    DOCUMENTS_CREATED = "documentsCreated"
    DOCUMENTS_UPDATED = "documentsUpdated"
    COLLECTIONS_CREATED = "collectionsCreated"
    COLLECTIONS_UPDATED = "collectionsUpdated"

class Archivist:
    def __init__(self, archive: Archive, username: str, display_name: str = None) -> None:
        self.username = username
        self.path = path.join(archive.path, "archivists", username + ".json")
        self.display_name = display_name or username
        self.stats = {
            "documentsCreated": 0,
            "documentsUpdated": 0,
            "collectionsCreated": 0,
            "collectionsUpdated": 0,
        }

    @staticmethod
    def load(archive: Archive, username: str):
        archivist = Archivist(archive, username)
        if not path.exists(archivist.path):
            return None
        with open(archivist.path, "r") as file:
            data = json.load(file)
        archivist.display_name = data["displayName"]
        archivist.stats = data["stats"]
        return archivist

    def save(self):
        data = {
            "username": self.username,
            "displayName": self.display_name,
            "stats": self.stats,
        }
        with open(self.path, "w") as file:
            json.dump(data, file)

    def increment_stat(self, stat: ArchivistStat):
        self.stats[stat.value] += 1
        self.save()

    def dict(self):
        return {
            "username": self.username,
            "displayName": self.display_name,
            "stats": self.stats,
        }

class DocumentMeta:
    def __init__(self, name: str, fileType: str, archivist: str, created: datetime = None, updated: datetime = None) -> None:
        self.name = name
        self.fileType = fileType
        self.archivist = archivist
        self.created = created or datetime.now()
        self.updated = updated

    @staticmethod
    def from_dict(data: dict):
        return DocumentMeta(
            name=data["name"],
            fileType=data["fileType"],
            archivist=data["archivist"],
            created=datetime.fromisoformat(data["created"]),
            updated=datetime.fromisoformat(data["updated"]),
        )

    @staticmethod
    def load(archive: Archive, doc_hash: str):
        meta_path = path.join(archive.path, "documents", doc_hash[:2], doc_hash[2:], "meta.json")
        if not path.exists(meta_path):
            return None
        with open(meta_path, "r") as file:
            return DocumentMeta.from_dict(json.load(file))

    def dict(self):
        return {
            "name": self.name,
            "fileType": self.fileType,
            "archivist": self.archivist,
            "created": self.created.isoformat(),
            "updated": self.updated.isoformat(),
        }

class Document:
    def __init__(self, archive: Archive, blob: bytes, meta: DocumentMeta, doc_hash: str = None) -> None:
        self.hash = doc_hash or sha256(blob).hexdigest()
        self.path = path.join(archive.path, "documents", self.hash[:2], self.hash[2:])
        self.blob = blob
        self.meta = meta

    @staticmethod
    def load(archive: Archive, doc_hash: str):
        doc = Document(archive, None, None, doc_hash)
        if not path.exists(doc.path):
            return None
        with open(path.join(doc.path, "blob"), "rb") as file:
            doc.blob = file.read()
        doc.meta = DocumentMeta.load(archive, doc_hash)
        return doc

    def save_meta(self):
        self.meta.updated = datetime.now()
        with open(path.join(self.path, "meta.json"), "w") as file:
            json.dump(self.meta.dict(), file)

    def save(self):
        if not path.exists(self.path):
            makedirs(self.path)
        self.save_meta()
        with open(path.join(self.path, "blob"), "wb") as file:
            file.write(self.blob)

    def rename(self, name: str):
        self.meta.name = name
        self.save_meta()

    def dict(self):
        return {
            "meta": self.meta.dict(),
            "blob": self.blob.decode("utf-8"),
        }

class Tag:
    def __init__(self, archive: Archive, name: str) -> None:
        self.name = name
        self.path = path.join(archive.path, "tags", name + ".tag")
        if path.exists(self.path):
            with open(self.path, "r") as file:
                self.collections = file.read().split("\n")
        else:
            self.collections = []

    @staticmethod
    def list(archive: Archive):
        return [path.splitext(name)[0] for name in listdir(path.join(archive.path, "tags"))]

    def save(self):
        with open(self.path, "w") as file:
            file.write("\n".join(self.collections))

    def add_collection(self, uuid: str):
        self.collections.append(uuid)
        self.save()

    def remove_collection(self, uuid: str):
        self.collections.remove(uuid)
        self.save()

class Collection:
    def __init__(self, archive: Archive, name: str, creator: str, uuid: str = None) -> None:
        self.archive = archive
        self.uuid = uuid or uuid1().hex
        self.path = path.join(archive.path, "collections", self.uuid + ".json")
        self.name = name
        self.creator = creator
        self.maintainers = [creator]
        self.documents: list[str] = []
        self.tags: list[str] = []
        self.created = datetime.now()
        self.updated = None

    @staticmethod
    def load(archive: Archive, uuid: str):
        collection = Collection(archive, None, None, uuid)
        if not path.exists(collection.path):
            return None
        with open(collection.path, "r") as file:
            data = json.load(file)
        collection.name = data["name"]
        collection.creator = data["creator"]
        collection.maintainers = data["maintainers"]
        collection.documents = data["documents"]
        collection.tags = data["tags"]
        collection.created = datetime.fromisoformat(data["created"])
        collection.updated = datetime.fromisoformat(data["updated"])
        return collection

    def dict(self):
        return {
            "name": self.name,
            "creator": self.creator,
            "maintainers": self.maintainers,
            "documents": self.documents,
            "tags": self.tags,
            "created": self.created.isoformat(),
            "updated": self.updated.isoformat(),
        }

    def save(self):
        self.updated = datetime.now()
        with open(self.path, "w") as file:
            json.dump(self.dict(), file)

    def add_document(self, doc_hash: str) -> bool:
        if doc_hash in self.documents:
            return False
        self.documents.append(doc_hash)
        self.save()
        return True

    def remove_document(self, doc_hash: str) -> bool:
        if doc_hash not in self.documents:
            return False
        self.documents.remove(doc_hash)
        self.save()
        return True

    def reorder_document(self, doc_hash: str, index: int) -> bool:
        if doc_hash not in self.documents:
            return False
        self.documents.remove(doc_hash)
        self.documents.insert(index, doc_hash)
        self.save()
        return True

    def add_maintainer(self, username: str) -> bool:
        if username in self.maintainers:
            return False
        self.maintainers.append(username)
        self.save()
        return True

    def add_tag(self, tag: str) -> bool:
        if tag in self.tags:
            return False
        self.tags.append(tag)
        self.save()
        tag_obj = Tag(self.archive, tag)
        tag_obj.add_collection(self.uuid)
        return True

    def remove_tag(self, tag: str) -> bool:
        if tag not in self.tags:
            return False
        self.tags.remove(tag)
        self.save()
        tag_obj = Tag(self.archive, tag)
        tag_obj.remove_collection(self.uuid)
        return True

    def rename(self, name: str):
        self.name = name
        self.save()

if not path.exists(ROOT_DIR):
    makedirs(ROOT_DIR)
