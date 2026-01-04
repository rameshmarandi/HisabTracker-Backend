import { Feature } from "../../../models/Admin/Features/feature.model.js";
import { SubscriptionPlan } from "../../../models/Admin/Subscription/subscriptionPlan.model.js";

import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

/**
 * 🔹 Price Calculation
 */
const calculateFinalPrice = (basePrice, discountPercent = 0) => {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new ApiError(400, "Invalid discount percent");
  }

  const discounted = basePrice - (basePrice * discountPercent) / 100;
  return Math.round(discounted);
};

/**
 * 🔹 Validate & Prepare Plan Features
 * Only plan-controlled features are allowed here
 */
const validateAndPrepareFeatures = async (features = []) => {
  if (!Array.isArray(features)) return [];

  const featureKeys = features.map((f) => f.featureKey);

  const dbFeatures = await Feature.find({
    key: { $in: featureKeys },
    isActive: true,
  });

  if (dbFeatures.length !== features.length) {
    throw new ApiError(400, "Invalid or inactive feature included");
  }

  return features.map((input) => {
    const feature = dbFeatures.find((f) => f.key === input.featureKey);

    // ❌ Block core features
    if (feature.defaultValue === true) {
      throw new ApiError(
        400,
        `${feature.name} is a core feature and cannot be overridden`
      );
    }

    // 🔍 Type validation
    if (feature.valueType === "boolean" && typeof input.value !== "boolean") {
      throw new ApiError(400, `${feature.name} requires boolean value`);
    }

    if (feature.valueType === "number" && typeof input.value !== "number") {
      throw new ApiError(400, `${feature.name} requires numeric value`);
    }

    return {
      featureId: feature._id,
      featureKey: feature.key,
      value: input.value,
    };
  });
};

/**
 * 🔥 Create Subscription Plan
 */
const createSubscriptionPlan = asyncHandler(async (req, res) => {
  const {
    name,
    planKey,
    description,
    durationInDays,
    hasExpiry,
    basePrice,
    discountPercent,
    benefits,
    order,
    features,
  } = req.body;

  if (!name) throw new ApiError(400, "Name is required");
  if (!planKey) throw new ApiError(400, "planKey is required");
  if (durationInDays === undefined)
    throw new ApiError(400, "Duration is required");
  if (basePrice === undefined)
    throw new ApiError(400, "Base price is required");

  if (hasExpiry && durationInDays <= 0) {
    throw new ApiError(400, "Expiring plans must have valid duration");
  }

  const existingPlan = await SubscriptionPlan.findOne({
    $or: [{ name }, { planKey }],
  });

  if (existingPlan) {
    throw new ApiError(409, "Plan name or planKey already exists");
  }

  const processedFeatures = await validateAndPrepareFeatures(features);
  const finalPrice = calculateFinalPrice(basePrice, discountPercent);

  const plan = await SubscriptionPlan.create({
    name,
    planKey,
    description,
    durationInDays,
    hasExpiry,
    basePrice,
    discountPercent,
    finalPrice,
    benefits,
    order: order || 0,
    features: processedFeatures,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, plan, "Subscription plan created"));
});

/**
 * 🔹 Get All Active Plans
 */
const getAllSubscriptionPlans = asyncHandler(async (req, res) => {
  const plans = await SubscriptionPlan.find({ isActive: true })
    .populate("features.featureId")
    .sort({ order: 1 });

  const formatted = plans.map((plan) => ({
    _id: plan._id,
    name: plan.name,
    planKey: plan.planKey,
    description: plan.description,
    durationInDays: plan.durationInDays,
    hasExpiry: plan.hasExpiry,
    basePrice: plan.basePrice,
    discountPercent: plan.discountPercent,
    finalPrice: plan.finalPrice,
    benefits: plan.benefits,
    order: plan.order,
    features: plan.features.map((f) => ({
      featureKey: f.featureKey,
      name: f.featureId?.name,
      description: f.featureId?.description,
      valueType: f.featureId?.valueType,
      value: f.value,
    })),
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, formatted, "Active plans fetched"));
});

/**
 * 🔄 Update Subscription Plan
 */
const updateSubscriptionPlan = asyncHandler(async (req, res) => {
  const { id, features, ...updateData } = req.body;

  if (!id) throw new ApiError(400, "Plan ID is required");

  const plan = await SubscriptionPlan.findById(id);
  if (!plan) throw new ApiError(404, "Plan not found");

  if (features) {
    plan.features = await validateAndPrepareFeatures(features);
  }

  Object.assign(plan, updateData);
  plan.finalPrice = calculateFinalPrice(plan.basePrice, plan.discountPercent);

  await plan.save();

  return res.status(200).json(new ApiResponse(200, plan, "Plan updated"));
});

/**
 * 🔄 Toggle Plan Status
 */
const toggleSubscriptionPlanStatus = asyncHandler(async (req, res) => {
  const { id } = req.body;
  if (!id) throw new ApiError(400, "Plan ID required");

  const plan = await SubscriptionPlan.findById(id);
  if (!plan) throw new ApiError(404, "Plan not found");

  plan.isActive = !plan.isActive;
  await plan.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        plan,
        `Plan is now ${plan.isActive ? "Active" : "Inactive"}`
      )
    );
});

/**
 * ❌ Delete Plan Permanently
 */
const deleteSubscriptionPlan = asyncHandler(async (req, res) => {
  const { id } = req.body;
  if (!id) throw new ApiError(400, "Plan ID required");

  await SubscriptionPlan.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Plan deleted permanently"));
});

export {
  createSubscriptionPlan,
  getAllSubscriptionPlans,
  updateSubscriptionPlan,
  toggleSubscriptionPlanStatus,
  deleteSubscriptionPlan,
};
