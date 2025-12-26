# Twilight Cloud
Self-hosted video storage and playback web app with end-to-end encryption

## Security
Twilight Cloud encrypts the following content using AES256-CTR:

- All chunks of DASHed video files
- DASH manifest (mpd file)

The following content is not encrypted and stored in plain text in the database:

- Metadata such as video filename and upload date
- Codec information

These security features enable the following:

- Object storage administrators cannot access video content or sensitive metadata such as filenames.
- Database administrators can access video metadata, but not video content.

The main key (Content Encryption Key) is encrypted with AES256-GCM using a Key Encryption Key derived from the user password using Argon2id with sufficiently secure parameters, and then stored in the database. No one can decrypt the CEK if a secure password is used.
