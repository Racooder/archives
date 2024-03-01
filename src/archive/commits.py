import time
import json
from archive.archives import archive_path, hash_sha256
from src.archive.archives import COMMITS_PATH, HEAD_PATH

# TODO: Replace commits with audit log

def get_head(archive: str):
    with open(archive_path(archive) + HEAD_PATH, "r") as file:
        return file.read()

def create_commit(archive: str, changes: dict):
    commit = {
        "parent": get_head(archive),
        "timestamp": time.time(),
        "changes": changes
    }
    commit_json = json.dumps(commit)
    commit_hash = hash_sha256(commit_json.encode())
    with open(archive_path(archive) + COMMITS_PATH + commit_hash, "w") as file:
        file.write(commit_json)
    with open(archive_path(archive) + HEAD_PATH, "w") as file:
        file.write(commit_hash)
    return commit_hash

def get_commit(archive: str, hash: str):
    with open(archive_path(archive) + COMMITS_PATH + hash, "r") as file:
        return json.loads(file.read())

def get_commits(archive: str, count: int):
    commits = []
    current = get_head(archive)
    for _ in range(count):
        if current == "":
            break
        commit = get_commit(archive, current)
        commits.append(commit)
        current = commit["parent"]
    return commits