// import axios from 'axios';
// import logger from '../utils/logger.js';

// const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

// export const sendSlackAlert = async (message) => {
//   try {
//     await axios.post(SLACK_WEBHOOK_URL, {
//       text: message,
//       blocks: [
//         {
//           type: 'section',
//           text: {
//             type: 'mrkdwn',
//             text: `*Alert:* ${message}`,
//           },
//         },
//       ],
//     });
//   } catch (err) {
//     logger.error(`Failed to send Slack alert: ${err.message}`);
//     console.error('Failed to send Slack alert:', err.message);
//   }
// };

import axios from "axios";
import logger from "../utils/logger.js";
// import logger from "../utils/logger.js";

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

const SEVERITY_EMOJI = {
  INFO: "🔵",
  WARN: "🟡",
  CRITICAL: "🔴",
};

export const sendSlackAlert = async ({
  event = "GENERAL",
  message = "",
  severity = "INFO",
  metadata = {},
}) => {
  if (!SLACK_WEBHOOK_URL) {
    logger.warn("⚠ Slack Webhook not configured!");
    return;
  }

  const emoji = SEVERITY_EMOJI[severity] || SEVERITY_EMOJI.INFO;

  const metaText =
    Object.keys(metadata).length > 0
      ? Object.entries(metadata)
          .map(([k, v]) => `• *${k}:* ${v}`)
          .join("\n")
      : "_No Metadata_";

  const text = `
🚀 *HisabTracker* — ${emoji} *${severity} ALERT*
> *Event:* ${event}
> *Message:* ${message}

${metaText}
`;

  try {
    await axios.post(SLACK_WEBHOOK_URL, { text });
  } catch (err) {
    logger.error(`Failed Slack alert: ${err.message}`);
  }
};
