// import { NotificationCampaign } from "../models/Admin/AdminNotificationManagement/notificationCampaign.model.js";
import { enqueueNotification } from "../queue/producers/notification.producer.js";
import { normalizeToIST, getDelayFromIST } from "../utils/timeUtils.js";

export const sendPushNotification = async ({
  title,
  body,
  image,
  tokens,
  scheduledTime,
  data = {},
}) => {
  let delay = 0;

  if (scheduledTime) {
    // Normalize to IST (works for both UTC ISO or IST string)
    const istDateTime = normalizeToIST(scheduledTime);

    // Compute delay in ms from now
    delay = getDelayFromIST(istDateTime);
  }

  console.log("⏰ Scheduling notification with delay (ms):", delay);

  // await enqueueNotification(
  //   {
  //     title,
  //     body,
  //     image,
  //     tokens,
  //     data,
  //   },
  //   delay
  // );

  const job = await enqueueNotification(
    {
      title,
      body,
      image,
      tokens,
      data,
    },
    delay
  );

  // If this is linked to a campaign, store job ID
  if (data.campaignId) {
    // await NotificationCampaign.findByIdAndUpdate(
    //   data.campaignId,
    //   { queueJobId: job.id },
    //   { new: true }
    // );
  }

  return job;
};
