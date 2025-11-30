import mongoose from "mongoose";

const BookSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Domain fields (map from Watermelon "books" table)
    title: { type: String, required: true },
    description: { type: String },
    colorCode: { type: String },
    isLocked: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },

    // 🔥 Sync fields
    localId: { type: String, required: true }, // client_id
    changeVersion: { type: Number, default: 1 }, // version
    isDeleted: { type: Boolean, default: false }, // deleted
  },
  { timestamps: true }
);

BookSchema.index({ user: 1, localId: 1 }, { unique: true });

export const Book = mongoose.model("Book", BookSchema);
