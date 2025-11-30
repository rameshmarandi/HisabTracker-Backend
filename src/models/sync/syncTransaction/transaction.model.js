import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: { type: String, enum: ["income", "expense"], required: true },
    amount: { type: Number, required: true },

    // UI label
    category: { type: String },
    // link to Category (local/server id)
    categoryId: { type: String },

    date: { type: Date, required: true },

    note: { type: String },

    // 🔥 Image fields
    photoUrl: { type: String }, // what client uses to display
    photoId: { type: String }, // Cloudinary public_id (or S3 key)

    // book link (local/server id)
    bookId: { type: String },

    // 🔥 Sync fields
    localId: { type: String, required: true }, // client_id
    changeVersion: { type: Number, default: 1 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TransactionSchema.index({ user: 1, localId: 1 }, { unique: true });

export const Transaction = mongoose.model("Transaction", TransactionSchema);
