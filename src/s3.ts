/** biome-ignore-all lint/style/noNonNullAssertion: Ignore in this file */
import { AwsClient } from "aws4fetch";

const S3RequestMethods = {
    PUT: "PUT",
    GET: "GET",
    DELETE: "DELETE",
};

export type S3RequestMethod = keyof typeof S3RequestMethods;

const aws = new AwsClient({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    region: process.env.AWS_S3_REGION!,
});

const S3_ENDPOINT = process.env.AWS_S3_ENDPOINT!;
const BUCKET_NAME = process.env.AWS_S3_BUCKET!;

export async function generateSignedUrl(objectKey: string, method: S3RequestMethod, expires: number): Promise<string> {
    const url = new URL(`${S3_ENDPOINT}/${BUCKET_NAME}/${objectKey}`);
    url.searchParams.set("X-Amz-Expires", expires.toString());

    const signedRequest = await aws.sign(url.toString(), {
        method: method,
        headers: method === S3RequestMethods.PUT ? { "Content-Type": "application/octet-stream" } : {},
        aws: { signQuery: true, service: "s3" },
    });

    return signedRequest.url;
}
