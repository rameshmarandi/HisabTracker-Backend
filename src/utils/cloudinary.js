import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ENV } from "./env.js";

// Configuration
cloudinary.config({
  cloud_name: ENV.CLOUDINARY_CLOUDE_NAME,
  api_key: ENV.CLOUDINARY_API_KEY,
  api_secret: ENV.CLOUDINARY_SECRET_KEY, // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      // resource_type: "auto",
    });

    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    console.error("Error while uploading file on cloudinary", error);
    fs.unlinkSync(localFilePath);
    return null;
  }
};
// Delete file from Cloudinary by public_id
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try {
    if (!publicId) throw new Error("Public ID is required to delete the file");

    // Use Cloudinary's destroy method to delete the file
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType, // Specify the correct resource type
    });

    if (response.result === "ok") {
      console.log(
        `File from Cloudinary with public ID ${publicId} deleted successfully.`
      );
    } else {
      console.log(
        `Failed to delete file with public ID ${publicId} on Cloudinary.`
      );
    }

    return response;
  } catch (error) {
    console.error("Error while deleting file from Cloudinary:", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
