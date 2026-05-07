import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const hasSmtp = Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

const transporter = hasSmtp
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass
      }
    })
  : null;

export const sendMail = async (to: string, subject: string, html: string) => {
  if (!transporter) {
    console.info(`[mail:disabled] ${subject} -> ${to}`);
    return;
  }

  await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject,
    html
  });
};

export const sendVerificationEmail = (to: string, code: string) => {
  const url = `${env.clientUrl}/verificar-email?email=${encodeURIComponent(to)}`;
  return sendMail(
    to,
    `Tu codigo de verificacion Degustan es ${code}`,
    `
      <div style="margin:0;padding:0;background:#140f0d;font-family:Arial,Helvetica,sans-serif;color:#241611;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#140f0d;padding:32px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff8ef;border-radius:28px;overflow:hidden;border:1px solid #eadbcd;">
                <tr>
                  <td style="background:linear-gradient(135deg,#2a1712,#7b2f1e);padding:32px;text-align:center;color:#fff8ef;">
                    <img src="${env.clientUrl}/logo.jpg" alt="Degustan Drink-Store" width="82" height="82" style="display:block;margin:0 auto 16px;border-radius:20px;background:#fff8ef;padding:6px;object-fit:contain;" />
                    <p style="margin:0 0 8px;color:#f0bf82;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">Degustan Drink-Store</p>
                    <h1 style="margin:0;font-size:34px;line-height:1;color:#fff8ef;">Verifica tu cuenta</h1>
                    <p style="margin:14px auto 0;max-width:420px;color:#f3d9c5;font-size:16px;line-height:1.6;">Usa este codigo para confirmar tu correo y empezar a comprar bebidas seleccionadas.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:34px 28px;text-align:center;">
                    <p style="margin:0;color:#6f5b4d;font-size:15px;">Tu codigo de verificacion es:</p>
                    <div style="display:inline-block;margin:18px 0 22px;padding:18px 30px;border-radius:20px;background:#241611;color:#ffd79f;font-size:42px;font-weight:900;letter-spacing:10px;">${code}</div>
                    <p style="margin:0 auto 22px;max-width:440px;color:#6f5b4d;font-size:15px;line-height:1.6;">El codigo vence en 24 horas. Si no creaste esta cuenta, podes ignorar este mensaje.</p>
                    <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#f3b35f,#a84625);color:#ffffff;text-decoration:none;font-weight:800;border-radius:999px;padding:14px 24px;">Ingresar codigo</a>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f2e4d4;padding:18px 28px;text-align:center;color:#7a6656;font-size:13px;">
                    Desarrollo por Pintos Julio y Agustin Burgos para <a href="https://www.webxpert.com.ar" style="color:#8d3a21;font-weight:800;">WebXpert</a>.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `
  );
};

interface OrderConfirmationEmailData {
  orderId: number;
  invoiceNumber?: string | null;
  total: string | number;
  subtotal: string | number;
  shippingCost: string | number;
  paymentMethod: "transferencia" | "mercadopago" | "efectivo";
  deliveryType: "delivery" | "retiro";
  deliveryFrom?: Date | null;
  deliveryTo?: Date | null;
  deliveryAddress?: string | null;
  phone?: string | null;
  deliveryBuyerPays: boolean;
  checkoutUrl?: string | null;
  bank?: {
    holder: string;
    bank: string;
    cbu: string;
    alias: string;
  } | null;
}

const money = (value: string | number) => Number(value).toLocaleString("es-AR", { minimumFractionDigits: 2 });
const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatTime = (value?: Date | null) =>
  value ? value.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : null;

export const sendOrderConfirmationEmail = (to: string, order: OrderConfirmationEmailData) => {
  const deliveryLabel = order.deliveryType === "retiro" ? "Retiro en local" : "Delivery";
  const deliveryWindow = `${formatTime(order.deliveryFrom) ?? "18:30"} a ${formatTime(order.deliveryTo) ?? "23:00"}`;
  const paymentLabel =
    order.paymentMethod === "mercadopago"
      ? "Mercado Pago"
      : order.paymentMethod === "efectivo"
        ? "Pago al retirar / efectivo en local"
        : "Transferencia bancaria";
  const paymentNote =
    order.paymentMethod === "transferencia"
      ? "Tu pedido queda reservado y pendiente de acreditacion. Cuando recibamos el pago, avanzamos con la preparacion."
      : order.paymentMethod === "efectivo"
        ? "Abonas en efectivo al retirar tu pedido en el local."
        : "Si todavia no completaste el pago, podes hacerlo desde el boton de Mercado Pago.";
  const pickupPolicy =
    "Los pedidos no retirados dentro de las 72 hs se consideran desistidos. Si el pedido fue pagado por Mercado Pago o transferencia, no hay devolucion del dinero.";

  return sendMail(
    to,
    `Recibimos tu pedido Degustan #${order.orderId}`,
    `
      <div style="margin:0;padding:0;background:#140f0d;font-family:Arial,Helvetica,sans-serif;color:#241611;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#140f0d;padding:32px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#fff8ef;border-radius:28px;overflow:hidden;border:1px solid #eadbcd;">
                <tr>
                  <td style="background:linear-gradient(135deg,#21120e,#7b2f1e);padding:34px 28px;text-align:center;color:#fff8ef;">
                    <img src="${env.clientUrl}/logo.jpg" alt="Degustan Drink-Store" width="86" height="86" style="display:block;margin:0 auto 16px;border-radius:22px;background:#fff8ef;padding:6px;object-fit:contain;" />
                    <p style="margin:0 0 8px;color:#f0bf82;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">Degustan Drink-Store</p>
                    <h1 style="margin:0;font-size:36px;line-height:1;color:#fff8ef;">Recibimos tu pedido</h1>
                    <p style="margin:14px auto 0;max-width:460px;color:#f3d9c5;font-size:16px;line-height:1.6;">Gracias por comprar con nosotros. Ya registramos tu pedido y te avisaremos cuando cambie de estado.</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:28px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:18px;">
                      <tr>
                        <td style="background:#241611;border-radius:22px;padding:20px;color:#fff8ef;">
                          <p style="margin:0;color:#f0bf82;font-size:12px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;">Pedido</p>
                          <h2 style="margin:6px 0 4px;font-size:28px;color:#fff8ef;">#${order.orderId}</h2>
                          <p style="margin:0;color:#e7c7ad;">${escapeHtml(order.invoiceNumber ?? "Numero interno pendiente")}</p>
                        </td>
                        <td style="width:16px;"></td>
                        <td style="background:#fff3df;border:1px solid #edc58c;border-radius:22px;padding:20px;text-align:right;color:#4a2a16;">
                          <p style="margin:0;color:#8d3a21;font-size:12px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;">Total</p>
                          <h2 style="margin:6px 0 0;font-size:30px;color:#4a2a16;">$${money(order.total)}</h2>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 12px;">
                      <tr>
                        <td style="background:#ffffff;border:1px solid #eadbcd;border-radius:18px;padding:18px;">
                          <p style="margin:0 0 8px;color:#8d3a21;font-size:12px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;">Entrega</p>
                          <p style="margin:0 0 6px;color:#241611;font-size:18px;font-weight:800;">${deliveryLabel}</p>
                          <p style="margin:0;color:#6f5b4d;line-height:1.6;">Horario: ${deliveryWindow} del dia del pedido.</p>
                          <p style="margin:6px 0 0;color:#6f5b4d;line-height:1.6;">Direccion: ${escapeHtml(order.deliveryAddress ?? "Retiro en local")}</p>
                          ${
                            order.deliveryType === "delivery"
                              ? `<p style="margin:10px 0 0;color:#8d3a21;font-weight:800;">El costo de delivery corre por cuenta del comprador.</p>`
                              : ""
                          }
                        </td>
                      </tr>
                      <tr>
                        <td style="background:#ffffff;border:1px solid #eadbcd;border-radius:18px;padding:18px;">
                          <p style="margin:0 0 8px;color:#8d3a21;font-size:12px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;">Pago</p>
                          <p style="margin:0 0 6px;color:#241611;font-size:18px;font-weight:800;">${paymentLabel}</p>
                          <p style="margin:0;color:#6f5b4d;line-height:1.6;">${paymentNote}</p>
                          ${
                            order.paymentMethod === "transferencia" && order.bank
                              ? `<div style="margin-top:12px;background:#f7eee5;border-radius:14px;padding:12px;color:#4d3d33;line-height:1.7;">
                                  <strong>Datos para transferencia</strong><br />
                                  Titular: ${escapeHtml(order.bank.holder)}<br />
                                  Banco: ${escapeHtml(order.bank.bank)}<br />
                                  CBU: ${escapeHtml(order.bank.cbu)}<br />
                                  Alias: ${escapeHtml(order.bank.alias)}
                                </div>`
                              : ""
                          }
                          ${
                            order.checkoutUrl
                              ? `<a href="${escapeHtml(order.checkoutUrl)}" style="display:inline-block;margin-top:14px;background:linear-gradient(135deg,#f3b35f,#a84625);color:#ffffff;text-decoration:none;font-weight:800;border-radius:999px;padding:14px 22px;">Pagar con Mercado Pago</a>`
                              : ""
                          }
                        </td>
                      </tr>
                    </table>

                    ${
                      order.deliveryType === "retiro"
                        ? `<div style="margin:8px 0 18px;background:#fff3df;border:1px solid #edc58c;border-radius:18px;padding:16px;color:#4a2a16;line-height:1.6;">
                            <strong style="display:block;margin-bottom:4px;color:#8d3a21;">Importante sobre el retiro</strong>
                            ${pickupPolicy}
                          </div>`
                        : ""
                    }

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;background:#ffffff;border:1px solid #eadbcd;border-radius:18px;padding:16px;">
                      <tr>
                        <td style="color:#6f5b4d;padding:4px 0;">Subtotal</td>
                        <td align="right" style="color:#241611;font-weight:800;padding:4px 0;">$${money(order.subtotal)}</td>
                      </tr>
                      <tr>
                        <td style="color:#6f5b4d;padding:4px 0;">Costo de envio registrado</td>
                        <td align="right" style="color:#241611;font-weight:800;padding:4px 0;">$${money(order.shippingCost)}</td>
                      </tr>
                      <tr>
                        <td style="border-top:2px solid #241611;color:#241611;font-size:18px;font-weight:800;padding-top:12px;">Total</td>
                        <td align="right" style="border-top:2px solid #241611;color:#241611;font-size:20px;font-weight:900;padding-top:12px;">$${money(order.total)}</td>
                      </tr>
                    </table>

                    <p style="margin:20px 0 0;color:#6f5b4d;font-size:14px;line-height:1.6;text-align:center;">Si tenes dudas sobre tu pedido, respondé este correo y te ayudamos.</p>
                  </td>
                </tr>

                <tr>
                  <td style="background:#f2e4d4;padding:18px 28px;text-align:center;color:#7a6656;font-size:13px;">
                    Desarrollo por Pintos Julio y Agustin Burgos para <a href="https://www.webxpert.com.ar" style="color:#8d3a21;font-weight:800;">WebXpert</a>.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `
  );
};

export const sendContactEmail = (from: string, name: string, message: string) =>
  sendMail(
    env.smtp.from,
    `Contacto web de ${name}`,
    `<p><strong>Email:</strong> ${from}</p><p>${message.replace(/\n/g, "<br />")}</p>`
  );
