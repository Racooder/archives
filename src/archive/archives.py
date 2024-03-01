import hashlib
import os

STORAGE_PATH = "../storage/"
COMMITS_PATH = "commits/"
HEAD_PATH = "head"
TAGS_PATH = "tags/"
DOCUMENTS_PATH = "documents/"

def hash_sha256(data: bytes):
    return hashlib.sha256(data).hexdigest()

def archive_path(name: str):
    return STORAGE_PATH + name + "/"

def list_archives():
    return os.listdir(STORAGE_PATH)

def new_archive(name: str):
    path = archive_path(name)
    os.makedirs(path + COMMITS_PATH)
    with open(path + HEAD_PATH, "w") as file:
        file.write("")
    os.makedirs(path + TAGS_PATH)
    os.makedirs(path + DOCUMENTS_PATH)
