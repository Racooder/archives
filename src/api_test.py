# Send post request to the API and get the response

import requests

url = "http://localhost:5000/"

print(requests.post(url + "archives", json={"name": "test"}).json())
print(requests.get(url + "archives").json())
print(requests.post(url + "archivist/new/test", json={"username": "racooder", "displayName": "racooder"}).json())
print(requests.post(url + "archivist/display-name/test", json={"name": "racooder", "displayName": "Racooder"}).json())
print(requests.get(url + "archivist/test/racooder").json())
document = requests.post(url + "document/test", json={"blob": "test", "name": "test", "fileType": "txt", "archivist": "racooder"}).json()
print(document)
print(requests.get(url + "document/test/" + document["hash"]).json())
print(requests.get(url + "document-meta/test/" + document["hash"]).json())
collection = requests.post(url + "collection/test", json={"name": "test collection", "creator": "racooder"}).json()
print(document)
print(requests.get(url + "collection/test/" + collection["uuid"]).json())
print(requests.post(url + "collection/test/" + collection["uuid"], json={"document": document["hash"]}).json())
print(requests.post(url + "collection/reorder/test/" + collection["uuid"], json={"document": document["hash"], "index": 0}).json())
print(requests.delete(url + "collection/test/" + collection["uuid"] + "/" + document["hash"]).json())
print(requests.post(url + "collection/tag/test/" + collection["uuid"], json={"tag": "test"}).json())
print(requests.get(url + "tag/list/test").json())
print(requests.get(url + "tag/collections/test/test").json())
print(requests.delete(url + "collection/tag/test/" + collection["uuid"], json={"tag": "test"}).json())
