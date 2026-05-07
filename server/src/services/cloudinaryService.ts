import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { env } from "../config/env.js";

const configured = Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);

if (configured) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true
  });
}

export const ensureCloudinaryConfigured = () => {
  if (!configured) {
    throw new Error("Cloudinary no esta configurado. Completa CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.");
  }
};

export const uploadImageBuffer = async (buffer: Buffer, filename?: string) => {
  ensureCloudinaryConfigured();

  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: env.cloudinary.folder,
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        filename_override: filename
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary no devolvio resultado"));
          return;
        }

        resolve(result);
      }
    );

    stream.end(buffer);
  });
};
