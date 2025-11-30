import { ApiError } from "./ApiError.js";

const pick = (obj, keys) =>
  keys.reduce((acc, key) => {
    if (obj && obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});

// Determine how to handle photo from client payload
const resolvePhotoMode = (rawData = {}) => {
  const raw = rawData.photoUri ?? rawData.photo_uri;

  if (raw === undefined) {
    return { mode: "noop", value: null }; // client sent nothing → don't touch
  }
  if (raw === null) {
    return { mode: "remove", value: null }; // delete image
  }
  if (raw === "NO_CHANGE") {
    return { mode: "no-change", value: null }; // keep existing
  }
  // otherwise treat as new upload input (base64, file://, etc.)
  return { mode: "upload", value: raw };
};

// 🔹 Incoming: mobile → server
export const normalizeIncomingItem = (rawItem, tableName, tableConfig) => {
  const {
    table,
    client_id,
    server_id,
    version,
    deleted,
    created_at,
    updated_at,
    data,
  } = rawItem;

  if (!client_id) {
    throw new ApiError(
      400,
      `Missing client_id for table "${table || tableName}"`
    );
  }

  const base = {
    localId: client_id,
    changeVersion: version ?? 1,
    isDeleted: !!deleted,
  };

  if (created_at) base.createdAt = new Date(created_at);
  if (updated_at) base.updatedAt = new Date(updated_at);

  const domain = pick(data || {}, tableConfig.pickFields);

  // special: transaction.date is timestamp on client
  if (
    tableName === "transactions" &&
    domain.date &&
    typeof domain.date === "number"
  ) {
    domain.date = new Date(domain.date);
  }

  let photo = { mode: "noop", value: null };
  if (tableName === "transactions") {
    photo = resolvePhotoMode(data || {});
  }

  return {
    serverId: server_id || null,
    base,
    domain,
    photo,
  };
};

// 🔹 Outgoing: server → mobile
export const normalizeOutgoingDoc = (doc, tableName, tableConfig) => {
  const plain = doc.toObject({ getters: false, virtuals: false });
  const domain = pick(plain, tableConfig.pickFields);

  let data = { ...domain };

  if (tableName === "transactions") {
    // convert date → ms
    if (data.date) {
      data.date = new Date(data.date).getTime();
    }
    // map photoUrl → photo_uri
    const { photoUrl, ...rest } = data;
    data = {
      ...rest,
      photo_uri: plain.photoUrl || null,
    };
  }

  if (tableName === "books" || tableName === "categories") {
    // nothing special, but you can customize if needed
  }

  return {
    table: tableName,
    server_id: String(plain._id),
    client_id: plain.localId,
    version: plain.changeVersion,
    deleted: plain.isDeleted,
    created_at: plain.createdAt ? plain.createdAt.getTime() : null,
    updated_at: plain.updatedAt ? plain.updatedAt.getTime() : null,
    data,
  };
};
