// import { SubscriptionChangeLog } from "../models/SubscriptionLogs/SubscriptionChangeLog.model.js";

/**
 * Logs create/update/delete actions for subscription-like documents
 * @param {Object} opts
 * @param {"COIN_PLAN"|"PROFINDER_PLAN"} opts.entityType
 * @param {"CREATE"|"UPDATE"|"DELETE"|"ACTIVATE"|"DEACTIVATE"|"PRICE_CHANGE"|"DISCOUNT_CHANGE"} opts.action
 * @param {ObjectId} opts.entityId
 * @param {Object} [opts.oldData]
 * @param {Object} [opts.newData]
 * @param {Object} req - Express request (to read admin & meta)
 */
export const logSubscriptionChange = async ({
  entityType,
  action,
  entityId,
  oldData = {},
  newData = {},
  req,
}) => {
  try {
    const admin = req.admin || req.user;

    // await SubscriptionChangeLog.create({
    //   entityType,
    //   entityId,
    //   action,
    //   oldData,
    //   newData,
    //   performedBy: admin?._id,
    //   performedByName: admin?.fullName || admin?.username || "", // ✅ capture name
    //   meta: {
    //     ip: req.ip,
    //     userAgent: req.headers["user-agent"],
    //   },
    // });
  } catch (err) {
    // Don’t block the main flow if logging fails
    console.error("ChangeLog error:", err.message);
  }
};
