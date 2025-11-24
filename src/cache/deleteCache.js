import cache from "./index.js";

import CacheKeys from "./CacheKeys.js";
const deleteUserCache = async (user) => {


  // Clear all cache if "clear_all" is passed
  if (user === "clear_all") {
    await cache.clear();
    console.log("All cache cleared");
    return; // Exit after clearing all cache
  }

  // Define cache keys based on user role
  const cacheKey =
    user.role === "super_admin"
      ? CacheKeys.super_admin
      : `${CacheKeys.branch_admin}_${user.churchBranchID}`;

  const newApplication =
    user.role === "super_admin"
      ? CacheKeys.application_super_admin
      : `${CacheKeys.application_branch_admin}_${user.churchBranchID}`;

  const currentUserKey = `${CacheKeys.current_user}_${user._id}`;

  // Delete specific cache entries
  await cache.del(currentUserKey);
  await cache.del(newApplication);
  await cache.del(cacheKey);

  console.log("Deleting specific user cache", {
    currentUserKey,
    newApplication,
    cacheKey,
  });
};
const deleteDailyVerseCache = async (user) => {
  // Delete specific cache entries
  await cache.del(CacheKeys.dailyVerse);
  await cache.del(CacheKeys.scheduledDailyVerses);

  console.log("Deleting daily verses cache", CacheKeys.dailyVerse ,CacheKeys.scheduledDailyVerses );
};

export { deleteUserCache, deleteDailyVerseCache };
