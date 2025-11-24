1. categoryId, subCategoryId, lat, lng, radius, date, timing , quantity

Socket.Message - START ------------

1. check wether the If worker not available or not

2. Search the worker in redis \* fall back to Db if redis is not working , filter out the user based n

   a. roleType: { $in: [USER_ROLES.SKILLED_WORKER, USER_ROLES.LABOUR] }, // onlye worker & labour
   b. isOnline: true,
   c. isBusy: false,
   d. isSubscriptionActive: true,
   e. skills: categoryId,

3. Detect the area like metrocity , developing city , or a rural area, sing lat, lng and areaConfigured.

4. Find the subskills details using subCategoryId, that actual amount on the rural area.

5. Based on amount Now we calcuate the final amount of the service

   a. If it's a metro area - Take the value from admin setting modal , the metro area percentage
   make then increase the product amount based on ruralPrice like Ex: ruralPrice \* (50%)

   b. Same goes with devleping city Ex : ruralPrice \* (30%)

   c. Keep the final amount as it as for rural area

6. Calcuate the FINAL_AMOUNT : final_product_price \* quantity

7. If worker is availabe in your area then
   proper message like Workers are available in your area, and here is the toalAmount and it's totalCost summer so that user can check the total amount and wehter the worker is aviable

// After booking

1. Deduct coins from user account as defined coins

2. Only user can cancelled the booking withing 30min and get 50% refund coins
   User can cancelled the booking any time after 30min he not get any refund.
   Only user can cancelled the booking Not by worker.
3. After booking they can see their contact
