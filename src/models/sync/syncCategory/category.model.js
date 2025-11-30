import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Link to book (can be local or server id string on client)
    bookId: { type: String, required: true },

    name: { type: String, required: true },
    colorCode: { type: String },
    isDefault: { type: Boolean, default: false },

    // 🔥 Sync fields
    localId: { type: String, required: true }, // client_id
    changeVersion: { type: Number, default: 1 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CategorySchema.index({ user: 1, localId: 1 }, { unique: true });

export const Category = mongoose.model("Category", CategorySchema);
