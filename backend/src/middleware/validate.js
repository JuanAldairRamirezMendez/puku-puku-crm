/**
 * Middleware de validación con Zod.
 * Uso: router.post('/ruta', validate(schema), controller)
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const first = Object.values(errors).flat()[0];
      return res.status(400).json({ error: first || 'Datos inválidos.', errors });
    }
    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
