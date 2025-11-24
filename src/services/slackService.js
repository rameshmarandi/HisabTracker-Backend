import axios from 'axios';
import logger from '../utils/logger.js';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export const sendSlackAlert = async (message) => {
  try {
    await axios.post(SLACK_WEBHOOK_URL, {
      text: message,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Alert:* ${message}`,
          },
        },
      ],
    });
  } catch (err) {
    logger.error(`Failed to send Slack alert: ${err.message}`);
    console.error('Failed to send Slack alert:', err.message);
  }
};
