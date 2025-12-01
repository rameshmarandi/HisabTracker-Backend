import { SubscriptionPlan } from "../../../models/Admin/SubscriptionModal/subscriptionPlan.model.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

// Helper – calculate final price
const calculateFinalPrice = (base, discount) => {
  const discountedAmount = (base * discount) / 100;
  return base - discountedAmount;
};

/**
 * 👉 Create Subscription Plan
 */
const createSubscriptionPlan = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    durationInDays,
    basePrice,
    discountPercent,
    benefits,
    order,
  } = req.body;

  if (!name) {
    throw new ApiError(400, "Name is required");
  }

  if (durationInDays === undefined || durationInDays === null) {
    throw new ApiError(400, "Duration is required");
  }

  if (basePrice === undefined || basePrice === null) {
    throw new ApiError(400, "Base Price is required");
  }

  const existing = await SubscriptionPlan.findOne({ name });
  if (existing) throw new ApiError(409, "Plan name already exists!");

  if (benefits && !Array.isArray(benefits)) {
    throw new ApiError(400, "Benefits must be an array");
  }

  const finalPrice = calculateFinalPrice(basePrice, discountPercent || 0);

  const plan = await SubscriptionPlan.create({
    name,
    description,
    durationInDays,
    basePrice,
    discountPercent,
    finalPrice,
    benefits,
    order: order ?? 0, // 👈 Save order if provided, else fallback to 0
  });

  return res
    .status(201)
    .json(new ApiResponse(201, plan, "Subscription Plan created successfully"));
});

/**
 * 👉 Get All Plans (No Pagination)
 */
const getAllSubscriptionPlans = asyncHandler(async (req, res) => {
  const plans = await SubscriptionPlan.find().sort({ order: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, plans, "Plans fetched successfully"));
});

/**
 * 👉 Update Plan
 */
const updateSubscriptionPlan = asyncHandler(async (req, res) => {
  const {
    id,
    name,
    description,
    durationInDays,
    basePrice,
    discountPercent,
    benefits,
    order,
  } = req.body;

  if (!id) throw new ApiError(400, "Plan ID is required!");

  const plan = await SubscriptionPlan.findById(id);
  if (!plan) throw new ApiError(404, "Plan not found!");

  if (name && plan.name !== name) {
    const exists = await SubscriptionPlan.findOne({ name });
    if (exists) throw new ApiError(409, "Another plan already uses this name!");
  }

  if (benefits !== undefined && !Array.isArray(benefits)) {
    throw new ApiError(400, "Benefits must be an array");
  }

  const finalPrice = calculateFinalPrice(
    basePrice ?? plan.basePrice,
    discountPercent ?? plan.discountPercent
  );

  // inside Object.assign
  Object.assign(plan, {
    name: name ?? plan.name,
    description: description ?? plan.description,
    durationInDays: durationInDays ?? plan.durationInDays,
    basePrice: basePrice ?? plan.basePrice,
    discountPercent: discountPercent ?? plan.discountPercent,
    finalPrice,
    ...(benefits !== undefined && { benefits }),
    order: order ?? plan.order,
  });
  await plan.save();

  return res
    .status(200)
    .json(new ApiResponse(200, plan, "Subscription Plan updated successfully"));
});

/**
 * 👉 Toggle Activate/Deactivate
 */
const toggleSubscriptionPlanStatus = asyncHandler(async (req, res) => {
  const { id } = req.body;
  if (!id) throw new ApiError(400, "Plan ID is required!");

  const plan = await SubscriptionPlan.findById(id);
  if (!plan) throw new ApiError(404, "Plan not found!");

  plan.isActive = !plan.isActive;
  await plan.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        plan,
        `Plan ${plan.isActive ? "Activated" : "Deactivated"} successfully`
      )
    );
});

/**
 * 👉 Delete Plan (Permanent)
 */
const deleteSubscriptionPlan = asyncHandler(async (req, res) => {
  const { id } = req.body;
  if (!id) throw new ApiError(400, "Plan ID is required!");

  const plan = await SubscriptionPlan.findById(id);
  if (!plan) throw new ApiError(404, "Plan not found!");

  await plan.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Plan deleted successfully"));
});

/**
 * 👉 Exports
 */
export {
  createSubscriptionPlan,
  getAllSubscriptionPlans,
  updateSubscriptionPlan,
  toggleSubscriptionPlanStatus,
  deleteSubscriptionPlan,
};
