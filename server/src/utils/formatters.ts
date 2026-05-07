import slugify from "slugify";

export const toPublicProduct = (product: any) => ({
  id: product.id,
  codigo: product.codigo,
  nombre: product.nombre,
  slug: product.slug,
  descripcion: product.descripcion,
  precio: Number(product.precioVenta),
  stock: product.stockActual,
  stockMinimo: product.stockMinimo,
  categoriaId: product.categoriaId,
  categoria: product.category?.nombre ?? null,
  imagenUrl: product.imagenUrl,
  destacado: Boolean(product.destacado)
});

export const makeSlug = (value: string) =>
  slugify(value, { lower: true, strict: true, trim: true });
