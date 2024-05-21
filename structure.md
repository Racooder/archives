# Structure

## Folder structure

```
archives
├── name of archive
│   ├── meta.json
│   ├── archivists
│   │   ├── name of archivist.json
│   │   └── ...
│   ├── documents
│   │   ├── first two digids of hash
│   │   │   ├── remaining hash of document
│   │   │   │   ├── meta.json
│   │   │   │   └── blob
│   │   │   └── ...
│   │   └── ...
│   ├── tags
│   │   ├── name of tag.tag
│   │   └── ...
│   ├── collections
│   │   ├── uuid of collection.json
│   │   └── ...
│   └── changelogs
│       ├── yyyy-MM-dd(n).gzip
│       └── latest.changelog
└── ...

```

## Archive Meta

```json
{
    "created": "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
    "updated": "2000-10-31T01:30:00.000-05:00",
}
```

## Archivist

```json
{
    "username": "lowercase-name-without-spaces-or-special-chars_unchangeable",
    "displayName": "Uppercase name with spaces",
    "stats": {
        "documentsCreated": 4,
        "documentsUpdated": 5,
        "collectionsCreated": 6,
        "collectionsUpdated": 7
    }
}
```

## Document Meta

```json
{
    "name": "Name of document",
    "fileType": "png",
    "archivist": "Name of archivist",
    "created": "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
    "updated": "2000-10-31T01:30:00.000-05:00"
}
```

## Tag

```
uuid of collection
...
```

## Collection

```json
{
    "name": "Name of collection",
    "creator": "Name of creator archivist",
    "maintainers": [
        "Name of maintaining archivist",
        "..."
    ],
    "documents": [
        "hash of file",
        "..."
    ],
    "tags": [
        "name of tag",
        "..."
    ],
    "created": "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
    "updated": "2000-10-31T01:30:00.000-05:00"
}
```

## Changelog

```
Archivist;ActionType;Target;Identifier;AdditionalData
```
```
racooder;created;document;f1086b05fb0e9ace4de604d54c0ae0c7297159c0
simon102;added;collection;ce92e9fb-c105-4b90-9846-55c608d3e085;f1086b05fb0e9ace4de604d54c0ae0c7297159c0
racooder;renamed;collection;ce92e9fb-c105-4b90-9846-55c608d3e085;old_name;new_name
racooder;tagged;collection;ce92e9fb-c105-4b90-9846-55c608d3e085;new_tag
simon102;untagged;document;f1086b05fb0e9ace4de604d54c0ae0c7297159c0;old_tag
simon102;deleted;document;f1086b05fb0e9ace4de604d54c0ae0c7297159c0
```
