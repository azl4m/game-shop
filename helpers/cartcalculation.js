//cart value calculation
const calculateCartTotals = (cart) => {
  let subtotal = 0;

  // Loop through the items in the cart and calculate the subtotal
  cart.items.forEach((item) => {
    const price = item.productId.price || 0;
    const quantity = item.quantity || 0;

    subtotal += price * quantity; // Calculate subtotal
  });

  const tax = Math.floor(subtotal * 0.18); //  18% tax rate
  let total = Math.floor(subtotal + tax);
  let delivery = 0;
  if (total < 2000) {
    delivery = 150;
  }
  if (delivery) {
    total += delivery;
  }

  return { subtotal, tax, total, delivery };
};

module.exports = {
  calculateCartTotals,
};
