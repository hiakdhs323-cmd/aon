# AonWiki

**AonWiki** is a self-hosted Korean wiki project based on [openNAMU](https://github.com/openNAMU/openNAMU), an open-source wiki engine that supports NamuMark and Markdown.

> This repository builds the upstream openNAMU `beta` branch. It is not affiliated with or endorsed by the official Namuwiki service.

## Features

- NamuMark and Markdown support through openNAMU
- Article creation, editing, revision/history and wiki links provided by the engine
- SQLite database stored in a persistent `data/` directory by default
- Docker-based local setup
- Can be deployed to a server that supports Docker and persistent storage

## Run locally

Requirements: Docker Engine and Docker Compose.

```bash
git clone https://github.com/hiakdhs323-cmd/aon.git
cd aon
docker compose up --build -d
```

Open **http://localhost:3000**. On a fresh wiki, follow the setup shown by openNAMU. The upstream project states that the first account to register receives owner privileges, so do not expose a new instance publicly until you are ready to create the owner account.

To stop the wiki:

```bash
docker compose down
```

Wiki data is stored in the named Docker volume `aonwiki-data`. Removing the container does not remove the volume. To back up the wiki, stop the service and back up that volume.

## Deployment and database persistence

This is a server-side application; **GitHub Pages alone cannot run the wiki engine or its database**. Deploy the Docker image on a host that supports long-running containers and persistent disks/volumes. Mount persistent storage at `/app/data` and expose port `3000` (or configure the host's port mapping).

Free hosting plans often have storage, sleep, bandwidth, or runtime limits. Some free web services erase local files on restart/redeploy, which would risk losing wiki edits. Check persistence and backup policies before choosing a host. There is no genuinely unlimited free database tier.

The default openNAMU database configuration uses SQLite in `data.db`. Do not place the database on an ephemeral filesystem if you need persistent articles.

## Updating openNAMU

The Docker build clones the upstream `beta` branch at build time. To rebuild with the current upstream version:

```bash
docker compose build --no-cache
docker compose up -d
```

Back up `aonwiki-data` before upgrading. The upstream project is in beta; review upstream changes before updating a production wiki.

## Upstream project and license

- Engine: [openNAMU](https://github.com/openNAMU/openNAMU)
- Upstream license: BSD 3-Clause; see the upstream repository for the full license and third-party notices.
- This repository's Docker and deployment configuration is provided for AonWiki.

For engine-specific options and troubleshooting, consult the [openNAMU README](https://github.com/openNAMU/openNAMU/blob/beta/readme.md).
