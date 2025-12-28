# Twilight Cloud
Self-hosted video storage and playback web app with end-to-end encryption

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
