import { Feature } from "../../../models/Admin/Features/feature.model.js";
import { SubscriptionPlan } from "../../../models/Admin/Subscription/subscriptionPlan.model.js";

import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

/**
 * 🔹 Helper – Price Calculation
 */
const calculateFinalPrice = (base, discount) => {
  const discountedAmount = (base * (discount || 0)) / 100;
  return base - discountedAmount;
};

/**
 * 🔹 Helper – Validate & Auto-map Feature Keys
 */
const validateAndPrepareFeatures = async (features) => {
  if (!features || !Array.isArray(features)) return [];

  const ids = features.map((f) => f.featureId);
  const dbFeatures = await Feature.find({ _id: { $in: ids }, isActive: true });

  if (dbFeatures.length !== features.length) {
    throw new ApiError(400, "Invalid or inactive feature included");
  }

  dbFeatures.forEach((ft) => {
    const inputFeature = features.find((x) => x.featureId == ft._id.toString());

    if (ft.valueType === "boolean" && typeof inputFeature.value !== "boolean")
      throw new ApiError(400, `${ft.name} requires Boolean value`);

    if (ft.valueType === "number" && typeof inputFeature.value !== "number")
      throw new ApiError(400, `${ft.name} requires Numeric value`);

    inputFeature.featureKey = ft.key;
  });

  return features;
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
  if (durationInDays === undefined || durationInDays === null)
    throw new ApiError(400, "Duration is required");
  if (basePrice === undefined || basePrice === null)
    throw new ApiError(400, "Base Price is required");

  const planExists = await SubscriptionPlan.findOne({ name });
  if (planExists) throw new ApiError(409, "Plan name already exists");

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
    .json(new ApiResponse(201, plan, "Subscription Plan created"));
});

/**
 * 🔹 Get All Plans
 */
const getAllSubscriptionPlans = asyncHandler(async (req, res) => {
  const plans = await SubscriptionPlan.find({ isActive: true })
    .populate("features.featureId")
    .sort({ order: 1 });

  const formattedPlans = plans.map((plan) => ({
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
    isActive: plan.isActive,
    order: plan.order,
    features: plan.features.map((f) => ({
      featureId: f.featureId?._id,
      featureKey: f.featureKey,
      name: f.featureId?.name,
      description: f.featureId?.description,
      valueType: f.featureId?.valueType,
      value: f.value,
    })),
  }));

  return res
    .status(200)
    .json(
      new ApiResponse(200, formattedPlans, "Active plans fetched successfully")
    );
});

/**
 * 🔄 Update Subscription Plan
 */
const updateSubscriptionPlan = asyncHandler(async (req, res) => {
  const { id, features, ...updateData } = req.body;

  if (!id) throw new ApiError(400, "Plan ID is required");

  const plan = await SubscriptionPlan.findById(id);
  if (!plan) throw new ApiError(404, "Plan not found");

  if (features !== undefined) {
    plan.features = await validateAndPrepareFeatures(features);
  }

  Object.assign(plan, updateData);
  plan.finalPrice = calculateFinalPrice(plan.basePrice, plan.discountPercent);

  await plan.save();

  return res.status(200).json(new ApiResponse(200, plan, "Plan updated"));
});

/**
 * Toggle Active Status
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
 * ❌ Permanent Delete
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
