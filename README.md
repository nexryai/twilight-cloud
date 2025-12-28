# Twilight Cloud
Self-hosted video storage and playback web app with end-to-end encryption

## Features

- Respect your privacy and security - All videos are encrypted in your browser before being uploaded to object storage. Performance is unaffected by the power of the Web Crypto API and stream encryption.
- Simple design - Video files are remuxed to DASH using WASM without re-encoding or quality loss.
- Deploy anywhere - Supports any serverless or serverful environment. Host your video wherever you like, from bare metal in your basement to the cloud. No server-side video processing is performed; file operations use S3 presigned URLs.

## Design
- Twilight Cloud's design goal is to create a lightweight, simple solution that is secure by default.
- Twilight Cloud does not encode videos; it only remuxes them to DASH on the browser. It cannot stream in multiple resolutions. However, it does not encounter codec patent issues, offers zero quality loss, and uses minimal storage.
- Uses OPFS to handle large video files that exceed memory size.
- Uses MongoDB as the database. This is a deliberate design choice to reduce costs when deploying to the cloud. Video chunk information, manifests, and other data are stored encrypted in object storage, so consistency on the database side is not a strong requirement. It does not rely on advanced MongoDB features, so it is possible to use compatible implementations such as Firestore.
- Twilight Cloud is not designed for sharing videos like YouTube, nor is it intended for streaming in mobile environments. If you require these features, we recommend using a service such as PeerTube, which performs server-side re-encoding to enable streaming in any environment.

## Security
Twilight Cloud encrypts the following content using AES256-CTR:

- All chunks of DASHed video files
- DASH manifest (mpd file)

The following data is encrypted using AES256-GCM:

- Filename/Video Title
- Playlist Name

The following content is not encrypted and stored in plain text in the database:

- Codec information
- Video ID in the playlist


The main keys (Content Encryption Key / Metadata Encryption Key) is encrypted with AES256-GCM using a Key Encryption Key derived from the user password using Argon2id with sufficiently secure parameters, and then stored in the database. No one can decrypt the CEK/MEK if a secure password is used.

### Caution
End-to-end encryption for web applications is not foolproof. Malicious script injection can completely subvert end-to-end encryption. End-to-end encryption is designed as an additional layer of security. When maintaining your server, remember to follow security best practices.
