import { Preference, MercadoPagoConfig } from "mercadopago";
import { Transaction } from "sequelize";
import { env } from "../config/env.js";
import { sequelize } from "../config/database.js";
import { Cart, CartItem, Customer, PaymentTransaction, Product, Sale, SaleItem, StockMovement, User } from "../models/index.js";
import { sendOrderConfirmationEmail } from "../utils/mailer.js";

const mpClient = env.mercadoPago.accessToken
  ? new MercadoPagoConfig({ accessToken: env.mercadoPago.accessToken })
  : null;

const todayDeliveryWindow = () => {
  const from = new Date();
  from.setHours(18, 30, 0, 0);
  const to = new Date();
  to.setHours(23, 0, 0, 0);
  return { from, to };
};

const getOrCreateCustomer = async (user: User, transaction: Transaction) => {
  const [customer] = await Customer.findOrCreate({
    where: { usuarioId: user.id },
    defaults: {
      usuarioId: user.id,
      nombre: `${user.nombre} ${user.apellido}`,
      email: user.email,
      telefono: user.telefono,
      direccion: user.direccion,
      activo: true
    },
    transaction
  });

  await customer.update(
    {
      nombre: `${user.nombre} ${user.apellido}`,
      email: user.email,
      telefono: user.telefono,
      direccion: user.direccion
    },
    { transaction }
  );

  return customer;
};

export const createOrderFromCart = async (
  userId: number,
  paymentMethod: "transferencia" | "mercadopago" | "efectivo",
  shipping: {
    direccion?: string;
    telefono?: string;
    email?: string;
    tipoEntrega: "delivery" | "retiro";
  }
) => {
  return sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(userId, { transaction });
    if (!user) throw new Error("Usuario no encontrado");
    if (paymentMethod === "efectivo" && shipping.tipoEntrega !== "retiro") {
      throw new Error("El pago en efectivo solo esta disponible para retiro en local");
    }

    const cart = await Cart.findOne({
      where: { usuarioId: userId, estado: "activo" },
      include: [{ model: CartItem, as: "items", include: [{ model: Product, as: "product" }] }],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!cart || !cart.items?.length) throw new Error("El carrito esta vacio");

    for (const item of cart.items) {
      if (!item.product || !item.product.activo || item.product.stockActual < item.cantidad) {
        throw new Error(`Stock insuficiente para ${item.product?.nombre ?? "producto"}`);
      }
    }

    const subtotal = cart.items.reduce((sum, item) => sum + Number(item.precioUnitario) * item.cantidad, 0);
    const customer = await getOrCreateCustomer(user, transaction);
    const deliveryWindow = todayDeliveryWindow();
    const deliveryNote =
      shipping.tipoEntrega === "delivery"
        ? "Delivery a cargo del comprador. Franja estimada: 18:30 a 23:00."
        : "Retiro en local disponible desde las 18:30 hasta las 23:00.";
    const paymentNote =
      paymentMethod === "transferencia"
        ? "Pendiente de acreditacion por transferencia. "
        : paymentMethod === "efectivo"
          ? "Pago al retirar en el local. "
          : "";
    const cancellationPolicy =
      " Los pedidos no retirados dentro de las 72 hs se consideran desistidos. En pedidos pagados por Mercado Pago o transferencia no hay devolucion del dinero.";
    const sale = await Sale.create(
      {
        numeroFactura: `WEB-${Date.now()}`,
        origen: "web",
        clienteId: customer.id,
        usuarioId: user.id,
        cajaId: null,
        subtotal,
        descuento: 0,
        costoEnvio: 0,
        total: subtotal,
        metodoPago: paymentMethod,
        estado: "pendiente",
        direccionEnvio: shipping.tipoEntrega === "delivery" ? shipping.direccion : "Retiro en local",
        emailContacto: shipping.email ?? user.email,
        telefonoContacto: shipping.telefono ?? user.telefono,
        tipoEntrega: shipping.tipoEntrega,
        entregaDesde: deliveryWindow.from,
        entregaHasta: deliveryWindow.to,
        deliveryACargoComprador: shipping.tipoEntrega === "delivery",
        observaciones: `${paymentNote}${deliveryNote}${shipping.tipoEntrega === "retiro" ? cancellationPolicy : ""}`
      } as any,
      { transaction }
    );

    for (const item of cart.items) {
      await SaleItem.create(
        {
          tipo: "producto",
          ventaId: sale.id,
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: Number(item.precioUnitario) * item.cantidad
        },
        { transaction }
      );

      const previousStock = item.product!.stockActual;
      const nextStock = previousStock - item.cantidad;
      await item.product!.update({ stockActual: nextStock }, { transaction });
      await StockMovement.create(
        {
          productoId: item.productoId,
          tipo: "salida",
          cantidad: item.cantidad,
          cantidadAnterior: previousStock,
          cantidadNueva: nextStock,
          motivo: "Venta ecommerce",
          usuarioId: user.id,
          referencia: sale.numeroFactura
        },
        { transaction }
      );
    }

    let checkoutUrl: string | null = null;
    let reference: string | null = null;

    if (paymentMethod === "mercadopago" && mpClient) {
      const preference = new Preference(mpClient);
      const response = await preference.create({
        body: {
          external_reference: String(sale.id),
          items: cart.items.map((item) => ({
            id: String(item.productoId),
            title: item.product!.nombre,
            quantity: item.cantidad,
            unit_price: Number(item.precioUnitario),
            currency_id: "ARS"
          })),
          back_urls: {
            success: `${env.clientUrl}/mi-cuenta`,
            failure: `${env.clientUrl}/checkout`,
            pending: `${env.clientUrl}/mi-cuenta`
          },
          notification_url: undefined
        }
      });
      checkoutUrl = response.init_point ?? null;
      reference = response.id ?? null;
    }

    await PaymentTransaction.create(
      {
        ventaId: sale.id,
        proveedor: paymentMethod,
        estado: "pendiente",
        monto: subtotal,
        referenciaExterna: reference,
        checkoutUrl,
        payload: null
      },
      { transaction }
    );

    await cart.update({ estado: "convertido" }, { transaction });
    await CartItem.destroy({ where: { carritoId: cart.id }, transaction });

    if (user.email) {
      await sendOrderConfirmationEmail(user.email, {
        orderId: sale.id,
        invoiceNumber: sale.numeroFactura,
        total: sale.total,
        subtotal: sale.subtotal,
        shippingCost: sale.costoEnvio,
        paymentMethod,
        deliveryType: shipping.tipoEntrega,
        deliveryFrom: deliveryWindow.from,
        deliveryTo: deliveryWindow.to,
        deliveryAddress: sale.direccionEnvio,
        phone: sale.telefonoContacto,
        deliveryBuyerPays: sale.deliveryACargoComprador,
        checkoutUrl,
        bank: paymentMethod === "transferencia" ? env.bank : null
      });
    }

    return { sale, checkoutUrl };
  });
};
