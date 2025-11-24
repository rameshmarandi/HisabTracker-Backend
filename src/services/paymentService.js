import Razorpay from "razorpay";
// import Stripe from "stripe";
// import PayPal from "paypal-rest-sdk";
import crypto from "crypto";
import dotenv from "dotenv";
import { ENV } from "../utils/env.js";

dotenv.config();

class PaymentService {
  constructor(provider) {
    this.provider = provider;

    switch (provider) {
      case "razorpay":
        this.gateway = new Razorpay({
          key_id: ENV.RAZORPAY_KEY_ID,
          key_secret: ENV.RAZORPAY_KEY_SECRET,
        });
        break;

      //   case "stripe":
      //     this.gateway = new Stripe(ENV.STRIPE_SECRET_KEY);
      //     break;

      //   case "paypal":
      //     PayPal.configure({
      //       mode: "live", // Use "sandbox" for testing
      //       client_id: ENV.PAYPAL_CLIENT_ID,
      //       client_secret: ENV.PAYPAL_CLIENT_SECRET,
      //     });
      //     this.gateway = PayPal;
      //     break;

      default:
        throw new Error("Invalid payment provider");
    }
  }

  async createOrder(amount, currency = "INR") {
    if (this.provider === "razorpay") {
      return await this.gateway.orders.create({
        amount: Math.round(Number(amount) * 100), // Convert to paise
        currency,
        receipt: `order_${Date.now()}`,
      });
    }
    // Future implementations for other providers can be added here

    // if (this.provider === "stripe") {
    //   return await this.gateway.paymentIntents.create({
    //     amount: amount * 100, // Convert to cents
    //     currency,
    //   });
    // }

    // if (this.provider === "paypal") {
    //   const create_payment_json = {
    //     intent: "sale",
    //     payer: { payment_method: "paypal" },
    //     transactions: [{ amount: { total: amount, currency } }],
    //     redirect_urls: {
    //       return_url: "https://yourapp.com/success",
    //       cancel_url: "https://yourapp.com/cancel",
    //     },
    //   };

    //   return new Promise((resolve, reject) => {
    //     this.gateway.payment.create(create_payment_json, (err, payment) => {
    //       if (err) reject(err);
    //       else resolve(payment);
    //     });
    //   });
    // }
  }

  async verifyPayment(paymentData) {
    if (this.provider === "razorpay") {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        paymentData;

      const hmac = crypto.createHmac("sha256", ENV.RAZORPAY_KEY_SECRET);
      hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
      const expectedSignature = hmac.digest("hex");

      return expectedSignature === razorpay_signature;
    }

    // Future implementations for other providers can be added here

    // if (this.provider === "stripe") {
    //   return this.gateway.paymentIntents.retrieve(paymentData.paymentIntentId);
    // }

    // if (this.provider === "paypal") {
    //   return new Promise((resolve, reject) => {
    //     this.gateway.payment.get(paymentData.paymentId, (err, payment) => {
    //       if (err) reject(err);
    //       else resolve(payment);
    //     });
    //   });
    // }
  }
  async refund(paymentId, amount) {
    if (this.provider === "razorpay") {
      try {
        const refund = await this.gateway.payments.refund(paymentId, {
          amount: amount * 100, // Razorpay expects amount in paise
        });

        return refund; // Return refund details
      } catch (err) {
        console.error("Razorpay Refund Error:", err);
        throw new ApiError(500, "Razorpay refund failed");
      }
    }

    throw new ApiError(400, "Refund not supported for this provider");
  }

  async verifyWebhookSignature(req) {
    if (this.provider === "razorpay") {
      const secret = ENV.RAZORPAY_WEBHOOK_SECRET;

      const signature = req.headers["x-razorpay-signature"];
      const body = JSON.stringify(req.body);

      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");

      return signature === expectedSignature;
    }

    // Future: Add verification for Stripe, PayPal here
    return false;
  }
}

export default PaymentService;
