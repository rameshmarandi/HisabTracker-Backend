export const calculateFinalPrice = (
  basePriceRural,
  areaType,
  metroPercent,
  developedPercent,
  quantity
) => {
  let price = parseFloat(basePriceRural);

  if (areaType === "metro") {
    price += (price * metroPercent) / 100;
  } else if (areaType === "developed") {
    price += (price * developedPercent) / 100;
  }

  const roundedUnitPrice = Math.round(price);
  const totalAmount = Math.round(roundedUnitPrice * parseInt(quantity));

  return { unitPrice: roundedUnitPrice, totalAmount };
};
