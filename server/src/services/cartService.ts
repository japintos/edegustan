import { Cart, CartItem, Product } from "../models/index.js";

export const getActiveCart = async (userId: number) => {
  const [cart] = await Cart.findOrCreate({
    where: { usuarioId: userId, estado: "activo" },
    defaults: { usuarioId: userId, estado: "activo" }
  });

  return Cart.findByPk(cart.id, {
    include: [{ model: CartItem, as: "items", include: [{ model: Product, as: "product" }] }]
  });
};

export const cartSummary = (cart: Cart | null) => {
  const items = cart?.items ?? [];
  const mapped = items.map((item) => ({
    id: item.id,
    productoId: item.productoId,
    cantidad: item.cantidad,
    precioUnitario: Number(item.precioUnitario),
    subtotal: Number(item.precioUnitario) * item.cantidad,
    product: item.product
  }));

  return {
    id: cart?.id,
    items: mapped,
    total: mapped.reduce((sum, item) => sum + item.subtotal, 0)
  };
};
