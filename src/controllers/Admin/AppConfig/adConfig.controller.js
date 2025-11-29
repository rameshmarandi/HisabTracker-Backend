// src/controllers/adminAdConfig.controller.js

import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { AdConfig } from "../../../models/Admin/AppConfig/adConfig.model.js";
import { sanitizeAdPlacement } from "../../../utils/sanitizeAdConfig.js";

// GET all placements (for admin panel)
const getAllAdConfigs = asyncHandler(async (req, res) => {
  const configs = await AdConfig.find({}).lean();
  const sanitized = configs.map(sanitizeAdPlacement);

  return res
    .status(200)
    .json(new ApiResponse(200, sanitized, "Ad configs fetched"));
});

// CREATE placement
const createAdConfig = asyncHandler(async (req, res) => {
  const { key } = req.body;
  if (!key) throw new ApiError(400, "Placement key is required");

  const exists = await AdConfig.findOne({ key });
  if (exists) throw new ApiError(400, "Placement with this key already exists");

  const config = await AdConfig.create(req.body);

  return res
    .status(201)
    .json(
      new ApiResponse(201, sanitizeAdPlacement(config), "Ad config created")
    );
});

// UPDATE placement
const updateAdConfig = asyncHandler(async (req, res) => {
  const { id, ...updates } = req.body;

  if (!id) throw new ApiError(400, "Ad config id is required");

  const config = await AdConfig.findById(id);
  if (!config) throw new ApiError(404, "Ad placement not found");

  // Prevent key & _id update
  delete updates.key;
  delete updates._id;

  const allowedFields = [
    "enabled",
    "frequency",
    "adUnitIdAndroid",
    "adUnitIdIOS",
    "type",
  ];

  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      config[field] = updates[field];
    }
  });

  await config.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        sanitizeAdPlacement(config),
        "Ad config updated successfully"
      )
    );
});

// DELETE placement
const deleteAdConfig = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) throw new ApiError(400, "Ad config id is required");

  const config = await AdConfig.findById(id);
  if (!config) throw new ApiError(404, "Ad placement not found");

  await config.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Ad config deleted successfully"));
});

export { getAllAdConfigs, createAdConfig, updateAdConfig, deleteAdConfig };
