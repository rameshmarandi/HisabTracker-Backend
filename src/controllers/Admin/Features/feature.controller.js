import { Feature } from "../../../models/Admin/Features/feature.model.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

// Create Feature
const createFeature = asyncHandler(async (req, res) => {
  const { name, key, category, valueType, defaultValue, description } =
    req.body;

  if (!name || !key || !valueType)
    throw new ApiError(400, "name, key and valueType are required");

  const exists = await Feature.findOne({ key });
  if (exists) throw new ApiError(409, "Feature key already exists");

  const feature = await Feature.create({
    name,
    key,
    category,
    valueType,
    defaultValue,
    description,
  });

  res
    .status(201)
    .json(new ApiResponse(201, feature, "Feature created successfully"));
});

// Get all features
const getAllFeatures = asyncHandler(async (req, res) => {
  const features = await Feature.find().sort({ createdAt: -1 });
  res.json(new ApiResponse(200, features, "Features fetched"));
});

// Update Feature
const updateFeature = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const feature = await Feature.findByIdAndUpdate(id, req.body, { new: true });

  if (!feature) throw new ApiError(404, "Feature not found");

  res.json(new ApiResponse(200, feature, "Feature updated successfully"));
});

// Soft delete (toggle active)
const toggleFeatureStatus = asyncHandler(async (req, res) => {
  const { id } = req.body;

  const feature = await Feature.findById(id);
  if (!feature) throw new ApiError(404, "Feature not found");

  feature.isActive = !feature.isActive;
  await feature.save();

  res.json(
    new ApiResponse(
      200,
      feature,
      `Feature is now ${feature.isActive ? "Active" : "Inactive"}`
    )
  );
});

const deleteFeature = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleted = await Feature.findByIdAndDelete(id);
  if (!deleted) throw new ApiError(404, "Feature not found");

  res.json(new ApiResponse(200, {}, "Feature deleted permanently"));
});

export {
  createFeature,
  getAllFeatures,
  updateFeature,
  toggleFeatureStatus,
  deleteFeature,
};
