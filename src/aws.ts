/** biome-ignore-all lint/style/noNonNullAssertion: Ignore in this file */
import { AwsClient } from "aws4fetch";

export const aws = new AwsClient({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    region: process.env.AWS_S3_REGION!,
});

export const S3_ENDPOINT = process.env.AWS_S3_ENDPOINT!;
export const BUCKET_NAME = process.env.AWS_S3_BUCKET!;
