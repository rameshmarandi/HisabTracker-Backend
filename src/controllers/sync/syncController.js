// asyncHandler
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../../utils/cloudinary.js";

import { ApiResponse } from "../../utils/ApiResponse.js";
import { SYNC_TABLES } from "../../models/sync/sync.models.js";
import {
  normalizeIncomingItem,
  normalizeOutgoingDoc,
} from "../../utils/sync.utils.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

/**
 * 🔹 PUSH SYNC: Device ➜ Server
 */
const pushChanges = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { items } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "items array is required");
  }

  const resultByTable = {
    books: [],
    categories: [],
    transactions: [],
  };

  for (const rawItem of items) {
    const tableName = rawItem.table;
    const tableConfig = SYNC_TABLES[tableName];
    if (!tableConfig) continue;

    const { model } = tableConfig;

    const { serverId, base, domain, photo } = normalizeIncomingItem(
      rawItem,
      tableName,
      tableConfig
    );

    let existing = null;

    /* =====================================================
       🔑 STRONG IDENTITY RESOLUTION (NO DUPLICATES)
    ===================================================== */

    // ---------- BOOKS ----------
    if (tableName === "books") {
      // 1️⃣ Default book is UNIQUE per user
      if (base.isDefault === true) {
        existing = await model.findOne({
          user: userId,
          isDefault: true,
        });
      }

      // 2️⃣ Server ID (strongest)
      if (!existing && serverId) {
        existing = await model.findOne({
          _id: serverId,
          user: userId,
        });
      }

      // 3️⃣ Local ID fallback
      if (!existing) {
        existing = await model.findOne({
          user: userId,
          localId: base.localId,
        });
      }
    }

    // ---------- CATEGORIES ----------
    else if (tableName === "categories") {
      // Category uniqueness = user + book + name + isDefault
      existing = await model.findOne({
        user: userId,
        book: domain.book,
        name: domain.name,
        isDefault: base.isDefault,
      });

      if (!existing && serverId) {
        existing = await model.findOne({
          _id: serverId,
          user: userId,
        });
      }

      if (!existing) {
        existing = await model.findOne({
          user: userId,
          localId: base.localId,
        });
      }
    }

    // ---------- TRANSACTIONS ----------
    else if (tableName === "transactions") {
      if (serverId) {
        existing = await model.findOne({
          _id: serverId,
          user: userId,
        });
      }

      if (!existing) {
        existing = await model.findOne({
          user: userId,
          localId: base.localId,
        });
      }
    }

    /* =====================================================
       🆕 CREATE
    ===================================================== */
    if (!existing) {
      if (base.isDeleted) {
        resultByTable[tableName].push({
          client_id: base.localId,
          server_id: null,
          action: "ignored_delete_missing",
        });
        continue;
      }

      const newDoc = new model({
        user: userId,
        ...domain,
        ...base,
      });

      // 🖼 Transaction image upload
      if (tableName === "transactions" && photo?.mode === "upload") {
        const uploaded = await uploadOnCloudinary(photo.value);
        if (uploaded) {
          newDoc.photoUrl = uploaded.secure_url;
          newDoc.photoId = uploaded.public_id;
        }
      }

      const created = await newDoc.save();

      resultByTable[tableName].push({
        client_id: created.localId,
        server_id: String(created._id),
        version: created.changeVersion,
        deleted: created.isDeleted,
        action: "created",
      });

      continue;
    }

    /* =====================================================
       🔄 UPDATE / DELETE
    ===================================================== */
    const incomingVersion = base.changeVersion;
    const currentVersion = existing.changeVersion;

    // Reject outdated client update
    if (incomingVersion < currentVersion) {
      resultByTable[tableName].push({
        client_id: existing.localId,
        server_id: String(existing._id),
        version: existing.changeVersion,
        deleted: existing.isDeleted,
        action: "skipped_older_version",
      });
      continue;
    }

    // Same version → timestamp wins
    if (
      incomingVersion === currentVersion &&
      base.updatedAt <= existing.updatedAt
    ) {
      resultByTable[tableName].push({
        client_id: existing.localId,
        server_id: String(existing._id),
        version: existing.changeVersion,
        deleted: existing.isDeleted,
        action: "skipped_newer_server",
      });
      continue;
    }

    existing.changeVersion = incomingVersion;
    existing.isDeleted = base.isDeleted;

    if (base.updatedAt) {
      existing.updatedAt = base.updatedAt;
    }

    if (!base.isDeleted) {
      Object.assign(existing, domain);
    }

    // 🖼 Transaction image handling
    if (tableName === "transactions") {
      if (base.isDeleted) {
        if (existing.photoId) {
          await deleteFromCloudinary(existing.photoId);
          existing.photoUrl = null;
          existing.photoId = null;
        }
      } else {
        if (photo?.mode === "upload") {
          if (existing.photoId) {
            await deleteFromCloudinary(existing.photoId);
          }
          const uploaded = await uploadOnCloudinary(photo.value);
          if (uploaded) {
            existing.photoUrl = uploaded.secure_url;
            existing.photoId = uploaded.public_id;
          }
        } else if (photo?.mode === "remove") {
          if (existing.photoId) {
            await deleteFromCloudinary(existing.photoId);
          }
          existing.photoUrl = null;
          existing.photoId = null;
        }
      }
    }

    await existing.save();

    resultByTable[tableName].push({
      client_id: existing.localId,
      server_id: String(existing._id),
      version: existing.changeVersion,
      deleted: existing.isDeleted,
      action: existing.isDeleted ? "marked_deleted" : "updated",
    });
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { results: resultByTable }, "Sync push complete")
    );
});


/**
 * 🔹 PULL SYNC: Server ➜ Device
 */
const pullChanges = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { lastSyncAt, tables } = req.body || {};

  if (!lastSyncAt && lastSyncAt !== 0) {
    throw new ApiError(400, "lastSyncAt timestamp required");
  }

  const since = new Date(lastSyncAt || 0);
  const targetTables = tables?.length ? tables : Object.keys(SYNC_TABLES);

  const changes = {
    books: [],
    categories: [],
    transactions: [],
  };

  for (const tableName of targetTables) {
    const config = SYNC_TABLES[tableName];
    if (!config) continue;

    const docs = await config.model
      .find({
        user: userId,
        updatedAt: { $gt: since },
      })
      .sort({ updatedAt: 1 });

    changes[tableName] = docs.map((doc) =>
      normalizeOutgoingDoc(doc, tableName, config)
    );
  }

  const serverTime = Date.now();

  return res
    .status(200)
    .json(new ApiResponse(200, { serverTime, changes }, "Sync pull complete"));
});

/**
 * 🔹 FIRST LOGIN / FRESH DEVICE FULL RESTORE
 */
const initialSync = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const changes = {
    books: [],
    categories: [],
    transactions: [],
  };

  for (const tableName of Object.keys(SYNC_TABLES)) {
    const { model } = SYNC_TABLES[tableName];

    const docs = await model
      .find({ user: userId, isDeleted: false })
      .sort({ updatedAt: 1 });

    changes[tableName] = docs.map((doc) =>
      normalizeOutgoingDoc(doc, tableName, SYNC_TABLES[tableName])
    );
  }

  const serverTime = Date.now();

  return res
    .status(200)
    .json(
      new ApiResponse(200, { serverTime, changes }, "Initial sync completed")
    );
});

export { pushChanges, pullChanges, initialSync };
